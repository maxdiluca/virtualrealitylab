import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inductionPath = "/Users/m.diluca@bham.ac.uk/Library/CloudStorage/OneDrive-SharedLibraries-UniversityofBirmingham/VRLab - Documents/VR Lab Induction 1.xlsx";
const authorsDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/content/authors";

const currentGroups = new Set([
  "Researchers",
  "Research Assistants",
  "Volunteer Research Assistants",
  "Project Students",
  "Interns",
  "Visitors",
]);

const staffOrLongTermGroups = new Set([
  "Principal Investigator",
  "Affiliated Faculty",
  "Collaborators",
  "PhD Students",
]);

const alumniTarget = new Map([
  ["Researchers", "Alumni Researchers"],
  ["Research Assistants", "Alumni Research Assistants"],
  ["Volunteer Research Assistants", "Alumni Research Assistants"],
  ["Project Students", "Alumni Project Students"],
  ["Interns", "Alumni Interns"],
  ["Visitors", "Review/removal: no Alumni Visitors group exists"],
]);

const inductionWorkbook = await loadWorkbook(inductionPath);
const accessRows = inductionWorkbook.worksheets.getItem("Sheet2").getRange("A1:C48").values;
const accessEntries = dedupeAccessEntries(extractCurrentAccessEntries(accessRows));
const accessAliasMap = buildAliasMap(accessEntries);
const authors = await extractLocalAuthorProfiles(authorsDir);

const activeAuthors = authors.filter((author) => author.groups.some((group) => currentGroups.has(group)));
const staffReview = authors.filter((author) => author.groups.some((group) => staffOrLongTermGroups.has(group)));

const candidates = [];
const activeMatched = [];
const possible = [];

for (const author of activeAuthors) {
  const match = compareName(author.title, accessAliasMap);
  const currentGroup = author.groups.find((group) => currentGroups.has(group)) ?? "";
  const targetGroup = alumniTarget.get(currentGroup) ?? "Review";

  const row = {
    name: author.title,
    role: author.role,
    currentGroup,
    proposedGroup: targetGroup,
    file: author.file,
    matchType: match.matchType,
    currentAccessMatch: match.matches.map((entry) => entry.canonicalName).join("; "),
  };

  if (match.rank === "exact") activeMatched.push(row);
  else if (match.rank === "possible") possible.push(row);
  else candidates.push(row);
}

const staffAbsent = [];
for (const author of staffReview) {
  const match = compareName(author.title, accessAliasMap);
  if (match.rank === "missing") {
    staffAbsent.push({
      name: author.title,
      role: author.role,
      groups: author.groups.join("; "),
      file: author.file,
    });
  }
}

console.log(JSON.stringify({
  currentAccessCount: accessEntries.length,
  currentWebsiteSourceProfilesChecked: activeAuthors.length,
  matchedActiveProfiles: activeMatched.length,
  moveToAlumniCandidates: candidates.length,
  possibleMatchesToReview: possible.length,
  candidates,
  possible,
  staffOrLongTermAbsentFromAccessNotRecommendedFromAccessAlone: staffAbsent,
}, null, 2));

async function loadWorkbook(filePath) {
  const input = await FileBlob.load(filePath);
  return SpreadsheetFile.importXlsx(input);
}

function extractCurrentAccessEntries(rows) {
  const entries = [];
  let currentRole = "";
  let currentSchool = "";

  for (let i = 0; i < rows.length; i += 1) {
    const [rawRole, rawSchool, rawName] = rows[i];
    const role = clean(rawRole);
    const school = clean(rawSchool);
    const name = clean(rawName);

    if (!role && !school && !name) continue;
    if (/^current access$/i.test(role) || /^primary role$/i.test(role)) continue;
    if (/^yes$/i.test(school)) continue;

    if (role) currentRole = role;
    if (school) currentSchool = school;
    if (!name) continue;

    entries.push({
      canonicalName: name,
      role: currentRole,
      school: currentSchool,
      sourceRows: [i + 1],
    });
  }

  return entries;
}

function dedupeAccessEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = normalizeName(entry.canonicalName);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.sourceRows.push(...entry.sourceRows);
      existing.roles = union(existing.roles, [entry.role]);
      existing.schools = union(existing.schools, [entry.school]);
    } else {
      map.set(key, {
        ...entry,
        roles: entry.role ? [entry.role] : [],
        schools: entry.school ? [entry.school] : [],
      });
    }
  }
  return [...map.values()];
}

async function extractLocalAuthorProfiles(dir) {
  const authorDirs = await fs.readdir(dir, { withFileTypes: true });
  const profiles = [];
  for (const authorDir of authorDirs) {
    if (!authorDir.isDirectory()) continue;
    const profileDir = path.join(dir, authorDir.name);
    for (const fileName of ["_index.md", "index.md"]) {
      const file = path.join(profileDir, fileName);
      const text = await readIfExists(file);
      if (!text) continue;
      const frontMatter = text.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatter) continue;
      const fm = frontMatter[1];
      const title = firstFrontMatterValue(fm, "title");
      if (!title) continue;
      profiles.push({
        title,
        role: firstFrontMatterValue(fm, "role"),
        groups: frontMatterList(fm, "user_groups"),
        file,
      });
      break;
    }
  }
  return profiles;
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function firstFrontMatterValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "mi"));
  return match ? match[1].trim() : "";
}

function frontMatterList(text, key) {
  const lines = text.split(/\r?\n/);
  const values = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!new RegExp(`^${key}:\\s*$`).test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(line)) break;
      const match = line.match(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/);
      if (match) values.push(match[1].trim());
    }
    break;
  }
  return values;
}

function buildAliasMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    for (const alias of makeNameAliases(entry.canonicalName)) {
      if (!alias) continue;
      if (!map.has(alias)) map.set(alias, []);
      map.get(alias).push(entry);
    }
  }
  return map;
}

function compareName(name, aliasMap) {
  const aliases = new Set(makeNameAliases(name));
  const exact = [];
  for (const alias of aliases) {
    if (aliasMap.has(alias)) exact.push(...aliasMap.get(alias));
  }
  if (exact.length) {
    return { rank: "exact", matchType: "Exact normalized name", matches: uniqueEntries(exact) };
  }

  const possible = possibleMatches(aliases, aliasMap);
  if (possible.length) {
    return { rank: "possible", matchType: "Token-overlap review needed", matches: possible };
  }

  return { rank: "missing", matchType: "No normalized name match", matches: [] };
}

function possibleMatches(entryAliases, aliasMap) {
  const candidates = new Map();
  for (const entryAlias of entryAliases) {
    const entryTokens = importantTokens(entryAlias);
    if (entryTokens.length < 2) continue;
    for (const [profileAlias, entries] of aliasMap.entries()) {
      const profileTokens = importantTokens(profileAlias);
      if (profileTokens.length < 2) continue;
      const shared = entryTokens.filter((token) => profileTokens.includes(token));
      const ratio = shared.length / Math.max(entryTokens.length, profileTokens.length);
      const lastNameShared = last(entryTokens) === last(profileTokens);
      if (shared.length >= 2 && (ratio >= 0.6 || lastNameShared)) {
        for (const entry of entries) candidates.set(entry.canonicalName, entry);
      }
    }
  }
  return [...candidates.values()];
}

function makeNameAliases(name) {
  if (!name) return [];
  const variants = [String(name).replace(/<[^>]*>/g, " ")];
  for (const value of [...variants]) {
    const comma = value.split(",");
    if (comma.length === 2) {
      variants.push(`${comma[1]} ${comma[0]}`);
      variants.push(`${comma[0]} ${comma[1]}`);
    }
  }

  const normalized = variants.map(normalizeName).filter(Boolean);
  const expanded = [];
  for (const alias of normalized) {
    expanded.push(alias);
    const tokens = alias.split(" ").filter(Boolean);
    if (tokens.length === 2) expanded.push(`${tokens[1]} ${tokens[0]}`);
    if (tokens.length >= 3) {
      expanded.push(`${tokens[tokens.length - 1]} ${tokens.slice(0, -1).join(" ")}`);
      expanded.push(`${tokens.slice(1).join(" ")} ${tokens[0]}`);
    }
    if (alias === "massimiliano di luca") expanded.push("max di luca");
    if (alias === "max di luca") expanded.push("massimiliano di luca");
    if (alias === "yan tone wong") expanded.push("yan wong");
    if (alias === "yan wong") expanded.push("yan tone wong");
    if (alias === "wei xiao" || alias === "xiao wei") expanded.push("monica wei");
    if (alias === "monica wei") expanded.push("wei xiao");
    if (alias === "lin yuehang") expanded.push("yuehang lin");
    if (alias === "du yunhao") expanded.push("yunhao du");
    if (alias === "fizri mulyana") expanded.push("fizri adiyesa");
    if (alias === "fizri adiyesa") expanded.push("fizri mulyana");
    if (alias === "diar abdlkarim") expanded.push("diar karim");
    if (alias === "diar karim") expanded.push("diar abdlkarim");
  }
  return [...new Set(expanded.map(normalizeName).filter(Boolean))];
}

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function importantTokens(alias) {
  return alias.split(" ").filter((token) => token && !["di", "de", "da", "van", "von", "the"].includes(token));
}

function uniqueEntries(entries) {
  const map = new Map();
  for (const entry of entries) map.set(entry.canonicalName, entry);
  return [...map.values()];
}

function union(existing, additions) {
  const set = new Set((existing ?? []).filter(Boolean));
  for (const value of additions) {
    if (value) set.add(value);
  }
  return [...set];
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function last(values) {
  return values[values.length - 1];
}
