import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inductionPath = "/Users/m.diluca@bham.ac.uk/Library/CloudStorage/OneDrive-SharedLibraries-UniversityofBirmingham/VRLab - Documents/VR Lab Induction 1.xlsx";
const livePeoplePath = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles/live_people.html";
const authorsDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/content/authors";
const outputDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles";
const reportPath = `${outputDir}/induction-website-profile-check.xlsx`;

const inductionWorkbook = await loadWorkbook(inductionPath);
const formRows = inductionWorkbook.worksheets.getItem("Sheet1").getRange("A1:AE127").values;
const accessRows = inductionWorkbook.worksheets.getItem("Sheet2").getRange("A1:C48").values;

const liveHtml = await fs.readFile(livePeoplePath, "utf8");
const liveProfiles = extractLivePeople(liveHtml);
const localProfiles = await extractLocalAuthorProfiles(authorsDir);

const formEntries = dedupeFormEntries(extractFormEntries(formRows));
const accessEntries = dedupeAccessEntries(extractAccessEntries(accessRows));

const liveAliasMap = buildAliasMap(liveProfiles);
const localAliasMap = buildAliasMap(localProfiles);

const formComparison = formEntries.map((entry) => compareAgainstWebsite(entry, liveAliasMap, localAliasMap));
const accessComparison = accessEntries.map((entry) => compareAgainstWebsite(entry, liveAliasMap, localAliasMap));

const missingLiveForm = formComparison.filter((entry) => entry.liveStatus === "No deployed profile found");
const possibleLiveForm = formComparison.filter((entry) => entry.liveStatus === "Possible deployed match only");
const foundLiveForm = formComparison.filter((entry) => entry.liveStatus === "Deployed profile found");
const missingLocalForm = formComparison.filter((entry) => entry.localStatus === "No local author profile found");
const localOnlyForm = formComparison.filter((entry) => entry.liveStatus !== "Deployed profile found" && entry.localStatus === "Local author profile found");

const missingLiveAccess = accessComparison.filter((entry) => entry.liveStatus === "No deployed profile found");

await writeReport({
  formComparison,
  accessComparison,
  missingLiveForm,
  possibleLiveForm,
  foundLiveForm,
  missingLocalForm,
  localOnlyForm,
  missingLiveAccess,
  liveProfiles,
  localProfiles,
});

console.log(JSON.stringify({
  deployedPeopleNames: liveProfiles.length,
  localAuthorProfiles: localProfiles.length,
  uniqueFormPeople: formEntries.length,
  deployedFound: foundLiveForm.length,
  deployedMissing: missingLiveForm.length,
  deployedPossibleOnly: possibleLiveForm.length,
  localMissing: missingLocalForm.length,
  localOnly: localOnlyForm.length,
  missingFromDeployedPeoplePage: missingLiveForm.map(compactEntry),
  possibleDeployedMatches: possibleLiveForm.map(compactEntry),
  accessListUniquePeople: accessEntries.length,
  accessListMissingFromDeployedPeoplePage: missingLiveAccess.map(compactEntry),
  reportPath,
}, null, 2));

async function loadWorkbook(filePath) {
  const input = await FileBlob.load(filePath);
  return SpreadsheetFile.importXlsx(input);
}

function extractFormEntries(rows) {
  const header = rows[0].map((value) => String(value ?? "").trim());
  const indexes = {
    id: header.indexOf("Id"),
    name: header.indexOf("Name"),
    fullName: header.indexOf("Full name"),
    role: header.indexOf("Primary Role"),
    lineManager: header.indexOf("Line manager"),
    preferredName: header.findIndex((value) => value.startsWith("How should we call you")),
  };

  return rows.slice(1)
    .map((row, offset) => ({
      sourceSheet: "Sheet1",
      sourceRow: offset + 2,
      id: row[indexes.id],
      name: clean(row[indexes.name]),
      fullName: clean(row[indexes.fullName]),
      preferredName: clean(row[indexes.preferredName]),
      role: clean(row[indexes.role]),
      lineManager: clean(row[indexes.lineManager]),
    }))
    .filter((entry) => entry.fullName || entry.name);
}

function extractAccessEntries(rows) {
  return rows.slice(5)
    .map((row, offset) => ({
      sourceSheet: "Sheet2",
      sourceRow: offset + 6,
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
      existing.ids = union(existing.ids, [entry.id]);
      existing.names = union(existing.names, [entry.name]);
      existing.roles = union(existing.roles, [entry.role]);
      existing.lineManagers = union(existing.lineManagers, [entry.lineManager]);
      existing.preferredNames = union(existing.preferredNames, [entry.preferredName]);
    } else {
      map.set(key, {
        ...entry,
        canonicalName: entry.fullName || entry.name,
        submissionCount: 1,
        sourceRows: [entry.sourceRow],
        ids: entry.id ? [entry.id] : [],
        names: entry.name ? [entry.name] : [],
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
    const key = normalizeName(entry.fullName || entry.name);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.sourceRows.push(entry.sourceRow);
      existing.roles = union(existing.roles, [entry.role]);
      existing.schools = union(existing.schools, [entry.school]);
    } else {
      map.set(key, {
        ...entry,
        canonicalName: entry.fullName || entry.name,
        sourceRows: [entry.sourceRow],
        roles: entry.role ? [entry.role] : [],
        schools: entry.school ? [entry.school] : [],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

function extractLivePeople(html) {
  const blocks = html.match(/<div class="col-12 col-sm-auto people-person">[\s\S]*?<\/div><\/div>/g) ?? [];
  const profiles = [];
  for (const block of blocks) {
    const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!h2) continue;
    const name = decodeHtml(stripTags(h2[1])).trim();
    if (!name) continue;
    const linkMatch = h2[1].match(/href=("[^"]+"|'[^']+'|[^ >]+)/);
    profiles.push({
      name,
      source: "Deployed People page",
      link: linkMatch ? linkMatch[1].replace(/^['"]|['"]$/g, "") : "",
    });
  }
  return uniqueProfiles(profiles);
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
      const email = firstFrontMatterValue(text, "email");
      profiles.push({
        name: title,
        source: "Local content/authors",
        path: filePath,
        email,
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
  const aliasMap = new Map();
  for (const profile of profiles) {
    for (const alias of makeNameAliases(profile.name)) {
      if (!alias) continue;
      if (!aliasMap.has(alias)) aliasMap.set(alias, []);
      aliasMap.get(alias).push(profile);
    }
  }
  return aliasMap;
}

function compareAgainstWebsite(entry, liveAliasMap, localAliasMap) {
  const aliases = makeEntryAliases(entry);
  const liveMatch = compareAliases(aliases, liveAliasMap);
  const localMatch = compareAliases(aliases, localAliasMap);

  return {
    ...entry,
    liveStatus: statusFromMatch(liveMatch, "Deployed profile found", "Possible deployed match only", "No deployed profile found"),
    liveMatchType: liveMatch.matchType,
    matchedLiveProfiles: liveMatch.profiles,
    localStatus: statusFromMatch(localMatch, "Local author profile found", "Possible local match only", "No local author profile found"),
    localMatchType: localMatch.matchType,
    matchedLocalProfiles: localMatch.profiles,
  };
}

function makeEntryAliases(entry) {
  return new Set([
    ...makeNameAliases(entry.fullName),
    ...makeNameAliases(entry.name),
    ...(entry.names ?? []).flatMap(makeNameAliases),
    ...(entry.preferredNames ?? []).flatMap(makeNameAliases),
  ].filter(Boolean));
}

function compareAliases(entryAliases, aliasMap) {
  const exactMatches = [];
  for (const alias of entryAliases) {
    if (aliasMap.has(alias)) exactMatches.push(...aliasMap.get(alias));
  }
  if (exactMatches.length) {
    return { matchType: "Exact normalized name", profiles: uniqueProfiles(exactMatches), rank: "found" };
  }

  const possible = possibleMatches(entryAliases, aliasMap);
  if (possible.length) {
    return { matchType: "Token-overlap review needed", profiles: possible, rank: "possible" };
  }

  return { matchType: "No normalized name match", profiles: [], rank: "missing" };
}

function statusFromMatch(match, foundStatus, possibleStatus, missingStatus) {
  if (match.rank === "found") return foundStatus;
  if (match.rank === "possible") return possibleStatus;
  return missingStatus;
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
  return [...candidates.values()];
}

function importantTokens(alias) {
  return alias.split(" ").filter((token) => token && !["di", "de", "da", "van", "von", "the"].includes(token));
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
    if (alias === "wei xiao" || alias === "xiao wei") expanded.push("monica wei");
    if (alias === "martin waehlisch") expanded.push("martin wahlisch");
    if (alias === "martin wahlisch") expanded.push("martin waehlisch");
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

function uniqueProfiles(profiles) {
  const map = new Map();
  for (const profile of profiles) {
    if (profile?.name) map.set(profile.name, profile);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function stripTags(html) {
  return String(html).replace(/<[^>]*>/g, " ");
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

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function union(existing, additions) {
  const set = new Set((existing ?? []).filter(Boolean));
  for (const value of additions) {
    if (value) set.add(value);
  }
  return [...set];
}

function last(values) {
  return values[values.length - 1];
}

function compactEntry(entry) {
  return {
    name: entry.canonicalName,
    roles: entry.roles ?? (entry.role ? [entry.role] : []),
    sourceRows: entry.sourceRows,
    submissions: entry.submissionCount,
    matchedLiveProfiles: entry.matchedLiveProfiles.map((profile) => profile.name),
    localStatus: entry.localStatus,
    matchedLocalProfiles: entry.matchedLocalProfiles.map((profile) => profile.name),
  };
}

async function writeReport(data) {
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("Summary");
  const missing = workbook.worksheets.add("Missing from Website");
  const all = workbook.worksheets.add("All Form Comparison");
  const access = workbook.worksheets.add("Sheet2 Access Check");
  const website = workbook.worksheets.add("Website Names");

  writeSimpleTable(summary, "A1:B11", [
    ["Metric", "Value"],
    ["Deployed People-page names checked", data.liveProfiles.length],
    ["Local author profile files checked", data.localProfiles.length],
    ["Unique people in Sheet1 form", data.formComparison.length],
    ["Sheet1 people with deployed profile found", data.foundLiveForm.length],
    ["Sheet1 people without deployed profile found", data.missingLiveForm.length],
    ["Sheet1 possible deployed matches requiring review", data.possibleLiveForm.length],
    ["Sheet1 people missing local author profile", data.missingLocalForm.length],
    ["Sheet1 people present locally but not found on deployed page", data.localOnlyForm.length],
    ["Unique people in Sheet2 current-access list", data.accessComparison.length],
    ["Sheet2 people without deployed profile found", data.missingLiveAccess.length],
  ]);

  writeSimpleTable(missing, `A1:H${Math.max(1, data.missingLiveForm.length) + 1}`, [
    ["Name", "Role(s)", "Preferred name(s)", "Line manager(s)", "Form row(s)", "Submission count", "Local source status", "Local match"],
    ...data.missingLiveForm.map((entry) => [
      entry.canonicalName,
      join(entry.roles),
      join(entry.preferredNames),
      join(entry.lineManagers),
      join(entry.sourceRows),
      entry.submissionCount,
      entry.localStatus,
      join(entry.matchedLocalProfiles.map((profile) => profile.name)),
    ]),
  ]);

  writeSimpleTable(all, `A1:I${data.formComparison.length + 1}`, [
    ["Name", "Submitted name variant(s)", "Role(s)", "Form row(s)", "Submission count", "Deployed status", "Deployed match", "Local source status", "Local source match"],
    ...data.formComparison.map((entry) => [
      entry.canonicalName,
      join(entry.names),
      join(entry.roles),
      join(entry.sourceRows),
      entry.submissionCount,
      entry.liveStatus,
      join(entry.matchedLiveProfiles.map((profile) => profile.name)),
      entry.localStatus,
      join(entry.matchedLocalProfiles.map((profile) => profile.name)),
    ]),
  ]);

  writeSimpleTable(access, `A1:G${data.accessComparison.length + 1}`, [
    ["Name", "Role(s)", "School(s)", "Source row(s)", "Deployed status", "Deployed match", "Local source status"],
    ...data.accessComparison.map((entry) => [
      entry.canonicalName,
      join(entry.roles),
      join(entry.schools),
      join(entry.sourceRows),
      entry.liveStatus,
      join(entry.matchedLiveProfiles.map((profile) => profile.name)),
      entry.localStatus,
    ]),
  ]);

  const websiteRows = [
    ["Name", "Source", "Link or path"],
    ...data.liveProfiles.map((profile) => [profile.name, "Deployed People page", profile.link]),
    ...data.localProfiles.map((profile) => [profile.name, "Local content/authors", profile.path]),
  ];
  writeSimpleTable(website, `A1:C${websiteRows.length}`, websiteRows);

  await verifyReport(workbook);
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
  sheet.getRange(rangeAddress.replace(/:.*/, ":Z1")).format.autofitColumns();
  range.format.autofitRows();
  sheet.freezePanes.freezeRows(1);
}

async function verifyReport(workbook) {
  const summary = await workbook.inspect({
    kind: "table",
    range: "Summary!A1:B11",
    include: "values,formulas",
    tableMaxRows: 11,
    tableMaxCols: 2,
    maxChars: 5000,
  });
  console.log(summary.ndjson);

  const missing = await workbook.inspect({
    kind: "table",
    range: "Missing from Website!A1:H30",
    include: "values,formulas",
    tableMaxRows: 30,
    tableMaxCols: 8,
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

  await workbook.render({ sheetName: "Summary", range: "A1:B11", scale: 2 });
  await workbook.render({ sheetName: "Missing from Website", range: "A1:H30", scale: 2 });
  await workbook.render({ sheetName: "All Form Comparison", range: "A1:I30", scale: 2 });
  await workbook.render({ sheetName: "Sheet2 Access Check", range: "A1:G30", scale: 2 });
  await workbook.render({ sheetName: "Website Names", range: "A1:C30", scale: 2 });
}

function join(values) {
  return (values ?? []).filter((value) => value !== "" && value !== null && value !== undefined).join("; ");
}
