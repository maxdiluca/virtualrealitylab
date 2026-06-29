import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inductionPath = "/Users/m.diluca@bham.ac.uk/Library/CloudStorage/OneDrive-SharedLibraries-UniversityofBirmingham/VRLab - Documents/VR Lab Induction 1.xlsx";
const livePeoplePath = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles/live_people.html";
const authorsDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/content/authors";
const outputDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles";
const reportPath = `${outputDir}/active-access-missing-website-profiles.xlsx`;

const inductionWorkbook = await loadWorkbook(inductionPath);
const accessRows = inductionWorkbook.worksheets.getItem("Sheet2").getRange("A1:C48").values;
const liveHtml = await fs.readFile(livePeoplePath, "utf8");

const accessEntries = dedupeAccessEntries(extractCurrentAccessEntries(accessRows));
const websiteProfiles = extractPeoplePageEntries(liveHtml);
const localProfiles = await extractLocalAuthorProfiles(authorsDir);

const websiteAliasMap = buildAliasMap(websiteProfiles);
const localAliasMap = buildAliasMap(localProfiles);

const comparison = accessEntries.map((entry) => {
  const websiteMatch = compareEntry(entry, websiteAliasMap);
  const localMatch = compareEntry(entry, localAliasMap);
  const bestWebsite = websiteMatch.matches[0];
  const bestLocal = localMatch.matches[0];
  const status = classifyWebsiteStatus(websiteMatch);

  return {
    ...entry,
    status,
    websiteMatchType: websiteMatch.matchType,
    websiteMatch: bestWebsite?.name ?? "",
    websiteSection: bestWebsite?.section ?? "",
    websiteGroup: bestWebsite?.group ?? "",
    websiteLink: bestWebsite?.link ?? "",
    hasWebsiteProfileLink: Boolean(bestWebsite?.link),
    localStatus: localMatch.matches.length ? "Local author file found" : "No local author file found",
    localMatchType: localMatch.matchType,
    localMatch: bestLocal?.name ?? "",
    localPath: bestLocal?.path ?? "",
  };
});

const missingOrNoProfile = comparison.filter((entry) =>
  entry.status === "Not listed on deployed People page" ||
  entry.status === "Listed, but no deployed profile link"
);
const linked = comparison.filter((entry) => entry.status === "Deployed profile link found");
const possible = comparison.filter((entry) => entry.status === "Possible website match only");

await writeReport({ comparison, missingOrNoProfile, linked, possible, websiteProfiles, localProfiles });

console.log(JSON.stringify({
  activeAccessPeople: comparison.length,
  deployedProfileLinkFound: linked.length,
  missingOrNoProfile: missingOrNoProfile.length,
  possibleWebsiteMatchOnly: possible.length,
  missingOrNoProfilePeople: missingOrNoProfile.map((entry) => ({
    name: entry.canonicalName,
    role: entry.role,
    school: entry.school,
    rows: entry.sourceRows,
    websiteStatus: entry.status,
    websiteMatch: entry.websiteMatch,
    localStatus: entry.localStatus,
    localMatch: entry.localMatch,
  })),
  possibleWebsiteMatches: possible.map((entry) => ({
    name: entry.canonicalName,
    rows: entry.sourceRows,
    websiteMatch: entry.websiteMatch,
    websiteLink: entry.websiteLink,
  })),
  reportPath,
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
    const row = rows[i];
    const colA = clean(row[0]);
    const colB = clean(row[1]);
    const colC = clean(row[2]);

    if (!colA && !colB && !colC) continue;
    if (/^current access$/i.test(colA) || /^primary role$/i.test(colA)) continue;
    if (/^yes$/i.test(colB)) continue;

    if (colA) currentRole = colA;
    if (colB) currentSchool = colB;
    if (!colC) continue;

    entries.push({
      canonicalName: colC,
      name: colC,
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

  return [...map.values()]
    .map((entry) => ({
      ...entry,
      role: join(entry.roles),
      school: join(entry.schools),
      sourceRows: [...new Set(entry.sourceRows)].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function extractPeoplePageEntries(html) {
  const sectionMatches = [...String(html).matchAll(/<div class="section-heading col-12 mb-3 text-center"><h1 class=mb-0>([^<]+)<\/h1><\/div>([\s\S]*?)(?=<div class="section-heading col-12 mb-3 text-center"><h1 class=mb-0>|<\/div><\/div><\/section>)/g)];
  const entries = [];

  for (const sectionMatch of sectionMatches) {
    const section = decodeHtml(sectionMatch[1]).trim();
    const sectionHtml = sectionMatch[2];
    const groupChunks = splitByGroups(sectionHtml);
    for (const chunk of groupChunks) {
      const people = chunk.html.match(/<div class="col-12 col-sm-auto people-person">[\s\S]*?<\/div><\/div>/g) ?? [];
      for (const block of people) {
        const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
        if (!h2) continue;
        const linkMatch = h2[1].match(/<a\b[^>]*href=("[^"]+"|'[^']+'|[^ >]+)[^>]*>/i);
        const name = decodeHtml(stripTags(h2[1])).trim();
        if (!name) continue;
        entries.push({
          name,
          section,
          group: chunk.group,
          link: linkMatch ? linkMatch[1].replace(/^['"]|['"]$/g, "") : "",
          source: "Deployed People page",
        });
      }
    }
  }

  return uniqueProfiles(entries);
}

function splitByGroups(sectionHtml) {
  const parts = [];
  const regex = /<div class=col-md-12><h2 class=mb-4>([^<]+)<\/h2><\/div>/g;
  const matches = [...sectionHtml.matchAll(regex)];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : sectionHtml.length;
    parts.push({ group: decodeHtml(matches[i][1]).trim(), html: sectionHtml.slice(start, end) });
  }
  return parts;
}

async function extractLocalAuthorProfiles(dir) {
  const authorDirs = await fs.readdir(dir, { withFileTypes: true });
  const profiles = [];
  for (const authorDir of authorDirs) {
    if (!authorDir.isDirectory()) continue;
    const profileDir = path.join(dir, authorDir.name);
    for (const fileName of ["_index.md", "index.md"]) {
      const filePath = path.join(profileDir, fileName);
      const text = await readIfExists(filePath);
      if (!text) continue;
      const title = firstFrontMatterValue(text, "title");
      if (!title) continue;
      profiles.push({
        name: title,
        path: filePath,
        source: "Local content/authors",
      });
      break;
    }
  }
  return uniqueProfiles(profiles);
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

function buildAliasMap(profiles) {
  const map = new Map();
  for (const profile of profiles) {
    for (const alias of makeNameAliases(profile.name)) {
      if (!alias) continue;
      if (!map.has(alias)) map.set(alias, []);
      map.get(alias).push(profile);
    }
  }
  return map;
}

function compareEntry(entry, aliasMap) {
  const aliases = new Set(makeNameAliases(entry.canonicalName));
  const exact = [];
  for (const alias of aliases) {
    if (aliasMap.has(alias)) exact.push(...aliasMap.get(alias));
  }
  if (exact.length) {
    return { rank: "exact", matchType: "Exact normalized name", matches: uniqueProfiles(exact) };
  }

  const possible = possibleMatches(aliases, aliasMap);
  if (possible.length) {
    return { rank: "possible", matchType: "Token-overlap review needed", matches: possible };
  }

  return { rank: "missing", matchType: "No normalized name match", matches: [] };
}

function classifyWebsiteStatus(match) {
  if (match.rank === "possible") return "Possible website match only";
  if (match.rank === "missing") return "Not listed on deployed People page";
  return match.matches.some((profile) => profile.link)
    ? "Deployed profile link found"
    : "Listed, but no deployed profile link";
}

function possibleMatches(entryAliases, aliasMap) {
  const candidates = new Map();
  for (const entryAlias of entryAliases) {
    const entryTokens = importantTokens(entryAlias);
    if (entryTokens.length < 2) continue;
    for (const [profileAlias, profiles] of aliasMap.entries()) {
      const profileTokens = importantTokens(profileAlias);
      if (profileTokens.length < 2) continue;
      const shared = entryTokens.filter((token) => profileTokens.includes(token));
      const ratio = shared.length / Math.max(entryTokens.length, profileTokens.length);
      const lastNameShared = last(entryTokens) === last(profileTokens);
      if (shared.length >= 2 && (ratio >= 0.6 || lastNameShared)) {
        for (const profile of profiles) candidates.set(profile.name, profile);
      }
    }
  }
  return [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function makeNameAliases(name) {
  if (!name) return [];
  const withoutEmail = String(name).replace(/<[^>]*>/g, " ");
  const parens = [...withoutEmail.matchAll(/\(([^)]*)\)/g)].map((match) => match[1]);
  const withoutParens = withoutEmail.replace(/\([^)]*\)/g, " ");
  const variants = [withoutEmail, withoutParens];

  for (const value of [withoutEmail, withoutParens]) {
    const comma = value.split(",");
    if (comma.length === 2) {
      variants.push(`${comma[1]} ${comma[0]}`);
      variants.push(`${comma[0]} ${comma[1]}`);
    }
  }

  for (const content of parens) {
    if (!/\b(msc|bsc|phd|ft|pt|student|science|psychology|cog|ne|data)\b/i.test(content)) {
      variants.push(content);
      variants.push(`${withoutParens} ${content}`);
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

async function writeReport(data) {
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("Summary");
  const missing = workbook.worksheets.add("Missing Active Profiles");
  const all = workbook.worksheets.add("All Active Access");
  const website = workbook.worksheets.add("Website People Page");

  writeSimpleTable(summary, "A1:B7", [
    ["Metric", "Value"],
    ["Active-access people checked", data.comparison.length],
    ["Deployed profile link found", data.linked.length],
    ["Not listed or listed without profile link", data.missingOrNoProfile.length],
    ["Possible website match only", data.possible.length],
    ["People-page entries parsed", data.websiteProfiles.length],
    ["Local author files parsed", data.localProfiles.length],
  ]);

  writeSimpleTable(missing, `A1:J${data.missingOrNoProfile.length + 1}`, [
    ["Name", "Role", "School", "Sheet2 row(s)", "Website status", "Website match", "Website group", "Website link", "Local status", "Local match"],
    ...data.missingOrNoProfile.map((entry) => [
      entry.canonicalName,
      entry.role,
      entry.school,
      join(entry.sourceRows),
      entry.status,
      entry.websiteMatch,
      entry.websiteGroup,
      entry.websiteLink,
      entry.localStatus,
      entry.localMatch,
    ]),
  ]);

  writeSimpleTable(all, `A1:L${data.comparison.length + 1}`, [
    ["Name", "Role", "School", "Sheet2 row(s)", "Website status", "Website match type", "Website match", "Website section", "Website group", "Website link", "Local status", "Local path"],
    ...data.comparison.map((entry) => [
      entry.canonicalName,
      entry.role,
      entry.school,
      join(entry.sourceRows),
      entry.status,
      entry.websiteMatchType,
      entry.websiteMatch,
      entry.websiteSection,
      entry.websiteGroup,
      entry.websiteLink,
      entry.localStatus,
      entry.localPath,
    ]),
  ]);

  writeSimpleTable(website, `A1:E${data.websiteProfiles.length + 1}`, [
    ["Name", "Section", "Group", "Has profile link", "Link"],
    ...data.websiteProfiles.map((profile) => [
      profile.name,
      profile.section,
      profile.group,
      profile.link ? "Yes" : "No",
      profile.link,
    ]),
  ]);

  await verifyReport(workbook, data.missingOrNoProfile.length);
  await fs.mkdir(outputDir, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(reportPath);
}

function writeSimpleTable(sheet, rangeAddress, rows) {
  const range = sheet.getRange(rangeAddress);
  range.values = rows;
  range.format = {
    font: { name: "Aptos", size: 10, color: "#111827" },
    borders: { preset: "all", style: "thin", color: "#E5E7EB" },
    verticalAlignment: "top",
    wrapText: true,
  };
  range.getRow(0).format = {
    fill: "#17324D",
    font: { name: "Aptos", size: 10, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  range.format.autofitRows();
  sheet.getRange("A:Z").format.autofitColumns();
  sheet.freezePanes.freezeRows(1);
}

async function verifyReport(workbook, missingRows) {
  const summary = await workbook.inspect({
    kind: "table",
    range: "Summary!A1:B7",
    include: "values,formulas",
    tableMaxRows: 7,
    tableMaxCols: 2,
    maxChars: 4000,
  });
  console.log(summary.ndjson);

  const missing = await workbook.inspect({
    kind: "table",
    range: `Missing Active Profiles!A1:J${Math.min(missingRows + 1, 30)}`,
    include: "values,formulas",
    tableMaxRows: 30,
    tableMaxCols: 10,
    maxChars: 12000,
  });
  console.log(missing.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
    maxChars: 4000,
  });
  console.log(errors.ndjson);

  await workbook.render({ sheetName: "Summary", range: "A1:B7", scale: 2 });
  await workbook.render({ sheetName: "Missing Active Profiles", range: `A1:J${Math.min(missingRows + 1, 30)}`, scale: 2 });
  await workbook.render({ sheetName: "All Active Access", range: "A1:L30", scale: 2 });
  await workbook.render({ sheetName: "Website People Page", range: "A1:E30", scale: 2 });
}

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function decodeHtml(text) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    auml: "ä",
    Auml: "Ä",
  };
  return String(text).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity] ?? `&${entity};`;
  });
}

function stripTags(html) {
  return String(html).replace(/<[^>]*>/g, " ");
}

function uniqueProfiles(profiles) {
  const map = new Map();
  for (const profile of profiles) {
    const key = `${normalizeName(profile.name)}|${profile.link ?? ""}|${profile.path ?? ""}`;
    if (profile?.name) map.set(key, profile);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function union(existing, additions) {
  const set = new Set((existing ?? []).filter(Boolean));
  for (const value of additions) {
    if (value) set.add(value);
  }
  return [...set];
}

function join(values) {
  return (values ?? []).filter((value) => value !== "" && value !== null && value !== undefined).join("; ");
}

function last(values) {
  return values[values.length - 1];
}
