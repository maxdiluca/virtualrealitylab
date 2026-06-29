import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inductionPath = "/Users/m.diluca@bham.ac.uk/Library/CloudStorage/OneDrive-SharedLibraries-UniversityofBirmingham/VRLab - Documents/VR Lab Induction 1.xlsx";
const profilesPath = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles/2026Sep-MSc-student-profiles.xlsx";
const outputDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles";
const reportPath = `${outputDir}/induction-missing-profile-check.xlsx`;

const inductionWorkbook = await loadWorkbook(inductionPath);
const profileWorkbook = await loadWorkbook(profilesPath);

const formRows = inductionWorkbook.worksheets.getItem("Sheet1").getRange("A1:AE127").values;
const accessRows = inductionWorkbook.worksheets.getItem("Sheet2").getRange("A1:C48").values;
const profileRows = profileWorkbook.worksheets.getItem("Directory").getRange("A4:K28").values;

const profileEntries = extractProfileEntries(profileRows);
const profileAliasMap = buildAliasMap(profileEntries);
const formEntries = dedupeFormEntries(extractFormEntries(formRows));
const accessEntries = dedupeAccessEntries(extractAccessEntries(accessRows));

const formComparison = formEntries.map((entry) => compareEntry(entry, profileAliasMap));
const accessComparison = accessEntries.map((entry) => compareEntry(entry, profileAliasMap));

const missingForm = formComparison.filter((entry) => entry.status === "No profile found");
const uncertainForm = formComparison.filter((entry) => entry.status === "Possible match only");
const matchedForm = formComparison.filter((entry) => entry.status === "Profile found");

const missingAccess = accessComparison.filter((entry) => entry.status === "No profile found");

await writeReport({
  formComparison,
  missingForm,
  uncertainForm,
  matchedForm,
  accessComparison,
  missingAccess,
  profileEntries,
});

console.log(JSON.stringify({
  profileCount: profileEntries.length,
  formUniqueCount: formEntries.length,
  formMatchedCount: matchedForm.length,
  formMissingCount: missingForm.length,
  formUncertainCount: uncertainForm.length,
  missingForm: missingForm.map(compactEntry),
  uncertainForm: uncertainForm.map(compactEntry),
  matchedForm: matchedForm.map(compactEntry),
  accessUniqueCount: accessEntries.length,
  accessMissingCount: missingAccess.length,
  reportPath,
}, null, 2));

async function loadWorkbook(path) {
  const input = await FileBlob.load(path);
  return SpreadsheetFile.importXlsx(input);
}

function extractProfileEntries(rows) {
  const header = rows[0].map((value) => String(value ?? "").trim());
  const nameIndex = header.indexOf("Name");
  const roleIndex = header.indexOf("Role");
  const supervisorIndex = header.indexOf("Supervisor");
  return rows.slice(1)
    .filter((row) => row[nameIndex])
    .map((row, index) => ({
      row: index + 5,
      name: clean(row[nameIndex]),
      role: clean(row[roleIndex]),
      supervisor: clean(row[supervisorIndex]),
    }));
}

function extractFormEntries(rows) {
  const header = rows[0].map((value) => String(value ?? "").trim());
  const indexes = {
    id: header.indexOf("Id"),
    email: header.indexOf("Email"),
    name: header.indexOf("Name"),
    fullName: header.indexOf("Full name"),
    role: header.indexOf("Primary Role"),
    lineManager: header.indexOf("Line manager"),
    nickname: header.findIndex((value) => value.startsWith("How should we call you")),
  };

  return rows.slice(1)
    .map((row, offset) => ({
      sourceSheet: "Sheet1",
      sourceRow: offset + 2,
      id: row[indexes.id],
      email: clean(row[indexes.email]),
      name: clean(row[indexes.name]),
      fullName: clean(row[indexes.fullName]),
      preferredName: clean(row[indexes.nickname]),
      role: clean(row[indexes.role]),
      lineManager: clean(row[indexes.lineManager]),
    }))
    .filter((entry) => entry.fullName || entry.name);
}

function extractAccessEntries(rows) {
  return rows.slice(4)
    .map((row, offset) => ({
      sourceSheet: "Sheet2",
      sourceRow: offset + 5,
      role: clean(row[0]),
      school: clean(row[1]),
      fullName: clean(row[2]),
      name: clean(row[2]),
    }))
    .filter((entry) => entry.fullName);
}

function dedupeFormEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = normalizeName(entry.fullName || entry.name);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.submissionCount += 1;
      existing.sourceRows.push(entry.sourceRow);
      existing.ids.push(entry.id);
      existing.emails = union(existing.emails, [entry.email]);
      existing.roles = union(existing.roles, [entry.role]);
      existing.lineManagers = union(existing.lineManagers, [entry.lineManager]);
      existing.preferredNames = union(existing.preferredNames, [entry.preferredName]);
    } else {
      map.set(key, {
        ...entry,
        canonicalName: entry.fullName || entry.name,
        submissionCount: 1,
        sourceRows: [entry.sourceRow],
        ids: [entry.id],
        emails: entry.email ? [entry.email] : [],
        roles: entry.role ? [entry.role] : [],
        lineManagers: entry.lineManager ? [entry.lineManager] : [],
        preferredNames: entry.preferredName ? [entry.preferredName] : [],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function dedupeAccessEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = normalizeName(entry.fullName);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.sourceRows.push(entry.sourceRow);
      existing.roles = union(existing.roles, [entry.role]);
      existing.schools = union(existing.schools, [entry.school]);
    } else {
      map.set(key, {
        ...entry,
        canonicalName: entry.fullName,
        sourceRows: [entry.sourceRow],
        roles: entry.role ? [entry.role] : [],
        schools: entry.school ? [entry.school] : [],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function union(existing, additions) {
  const set = new Set(existing.filter(Boolean));
  for (const value of additions) {
    if (value) set.add(value);
  }
  return [...set];
}

function buildAliasMap(profileEntries) {
  const aliasMap = new Map();
  for (const profile of profileEntries) {
    for (const alias of makeNameAliases(profile.name)) {
      if (!alias) continue;
      if (!aliasMap.has(alias)) aliasMap.set(alias, []);
      aliasMap.get(alias).push(profile);
    }
  }
  return aliasMap;
}

function compareEntry(entry, aliasMap) {
  const entryAliases = new Set([
    ...makeNameAliases(entry.fullName),
    ...makeNameAliases(entry.name),
  ].filter(Boolean));

  const exactMatches = [];
  for (const alias of entryAliases) {
    if (aliasMap.has(alias)) exactMatches.push(...aliasMap.get(alias));
  }
  if (exactMatches.length) {
    const matches = uniqueProfiles(exactMatches);
    return { ...entry, status: "Profile found", matchType: "Exact normalized name", matchedProfiles: matches };
  }

  const possible = possibleMatches(entryAliases, aliasMap);
  if (possible.length) {
    return { ...entry, status: "Possible match only", matchType: "Token overlap", matchedProfiles: possible };
  }

  return { ...entry, status: "No profile found", matchType: "No normalized name match", matchedProfiles: [] };
}

function possibleMatches(entryAliases, aliasMap) {
  const candidates = new Map();
  for (const entryAlias of entryAliases) {
    const entryTokens = new Set(entryAlias.split(" ").filter(Boolean));
    if (entryTokens.size < 2) continue;
    for (const [profileAlias, profiles] of aliasMap.entries()) {
      const profileTokens = new Set(profileAlias.split(" ").filter(Boolean));
      if (profileTokens.size < 2) continue;
      const shared = [...entryTokens].filter((token) => profileTokens.has(token));
      const sharedRatio = shared.length / Math.max(entryTokens.size, profileTokens.size);
      const sameFirstOrLast = first(entryTokens) === first(profileTokens) || last(entryTokens) === last(profileTokens);
      if (shared.length >= 2 && sharedRatio >= 0.5 && sameFirstOrLast) {
        for (const profile of profiles) candidates.set(profile.name, profile);
      }
    }
  }
  return [...candidates.values()];
}

function uniqueProfiles(profiles) {
  const map = new Map();
  for (const profile of profiles) map.set(profile.name, profile);
  return [...map.values()];
}

function first(set) {
  return [...set][0];
}

function last(set) {
  const values = [...set];
  return values[values.length - 1];
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
    if (!/\b(msc|ft|pt|student|science|cog|ne|data)\b/i.test(content)) {
      variants.push(content);
      variants.push(`${withoutParens} ${content}`);
    }
  }

  return [...new Set(variants.map(normalizeName).filter(Boolean))];
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

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function compactEntry(entry) {
  return {
    name: entry.canonicalName,
    roles: entry.roles ?? (entry.role ? [entry.role] : []),
    sourceRows: entry.sourceRows,
    submissions: entry.submissionCount,
    matchedProfiles: entry.matchedProfiles.map((profile) => profile.name),
  };
}

async function writeReport(data) {
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("Summary");
  const missing = workbook.worksheets.add("Missing from Sheet1");
  const all = workbook.worksheets.add("All Sheet1 comparison");
  const currentAccess = workbook.worksheets.add("Sheet2 comparison");
  const profiles = workbook.worksheets.add("Existing profiles");

  const summaryRows = [
    ["Metric", "Value"],
    ["Existing profiles checked", data.profileEntries.length],
    ["Unique people in Sheet1 form", data.formComparison.length],
    ["Sheet1 people with profile found", data.matchedForm.length],
    ["Sheet1 people without profile found", data.missingForm.length],
    ["Sheet1 possible matches requiring review", data.uncertainForm.length],
    ["Unique people in Sheet2 current-access list", data.accessComparison.length],
    ["Sheet2 people without profile found", data.missingAccess.length],
  ];
  writeSimpleTable(summary, "A1:B8", summaryRows);

  const missingRows = [
    ["Name", "Primary role(s)", "Email(s)", "Preferred name(s)", "Line manager(s)", "Form row(s)", "Submission count"],
    ...data.missingForm.map((entry) => [
      entry.canonicalName,
      join(entry.roles),
      join(entry.emails),
      join(entry.preferredNames),
      join(entry.lineManagers),
      join(entry.sourceRows),
      entry.submissionCount,
    ]),
  ];
  writeSimpleTable(missing, `A1:G${missingRows.length}`, missingRows);

  const allRows = [
    ["Name", "Status", "Match type", "Matched profile(s)", "Primary role(s)", "Email(s)", "Form row(s)", "Submission count"],
    ...data.formComparison.map((entry) => [
      entry.canonicalName,
      entry.status,
      entry.matchType,
      join(entry.matchedProfiles.map((profile) => profile.name)),
      join(entry.roles),
      join(entry.emails),
      join(entry.sourceRows),
      entry.submissionCount,
    ]),
  ];
  writeSimpleTable(all, `A1:H${allRows.length}`, allRows);

  const accessRows = [
    ["Name", "Status", "Matched profile(s)", "Role(s)", "School(s)", "Source row(s)"],
    ...data.accessComparison.map((entry) => [
      entry.canonicalName,
      entry.status,
      join(entry.matchedProfiles.map((profile) => profile.name)),
      join(entry.roles),
      join(entry.schools),
      join(entry.sourceRows),
    ]),
  ];
  writeSimpleTable(currentAccess, `A1:F${accessRows.length}`, accessRows);

  const profileListRows = [
    ["Name", "Role", "Supervisor", "Directory row"],
    ...data.profileEntries.map((entry) => [entry.name, entry.role, entry.supervisor, entry.row]),
  ];
  writeSimpleTable(profiles, `A1:D${profileListRows.length}`, profileListRows);

  await fs.mkdir(outputDir, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(reportPath);
}

function writeSimpleTable(sheet, rangeAddress, rows) {
  const range = sheet.getRange(rangeAddress);
  range.values = rows;
  range.format = {
    font: { name: "Aptos", size: 10, color: "#111827" },
    borders: { preset: "all", style: "thin", color: "#D9E2EC" },
    verticalAlignment: "top",
    wrapText: true,
  };
  range.getRow(0).format = {
    fill: "#2F5D7C",
    font: { name: "Aptos", size: 10, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(rangeAddress.replace(/\d+:.*/, ":Z")).format.autofitColumns();
  range.format.autofitRows();
  sheet.freezePanes.freezeRows(1);
}

function join(values) {
  return (values ?? []).filter((value) => value !== null && value !== undefined && String(value).trim()).join("; ");
}
