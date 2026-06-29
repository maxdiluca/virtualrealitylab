import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = "/Users/m.diluca@bham.ac.uk/Downloads/2026Sep-MSc.xlsx";
const outputDir = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles";
const outputPath = `${outputDir}/2026Sep-MSc-student-profiles.xlsx`;

const input = await FileBlob.load(inputPath);
const sourceWorkbook = await SpreadsheetFile.importXlsx(input);
const mainSheet = sourceWorkbook.worksheets.getItem("MSc-Intern VRLab");
const sourceValues = mainSheet.getRange("A1:K25").values;

const headers = sourceValues[0].map((value) => normalizeHeader(value));
const records = sourceValues.slice(1)
  .map((row, index) => rowToRecord(headers, row, index + 2))
  .filter((record) => record.name);

const workbook = Workbook.create();
const directory = workbook.worksheets.add("Directory");
const profiles = workbook.worksheets.add("Profiles");
const source = workbook.worksheets.add("Source Data");

buildDirectory(directory, records);
buildProfiles(profiles, records);
buildSource(source, sourceValues);

await verifyWorkbook(workbook);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function rowToRecord(headers, row, sourceRow) {
  const obj = { sourceRow };
  headers.forEach((header, index) => {
    const key = header || `unnamed_${index + 1}`;
    obj[key] = cleanCell(row[index]);
  });
  return {
    sourceRow,
    role: obj.role,
    name: obj.name,
    supervisor: obj.supervisor,
    period: obj.period,
    area: obj.area,
    title: obj.title,
    overleaf: obj.overleaf,
    githubText: obj["github text"],
    githubCode: obj["github code"],
    labDays: obj["days in the lab (in a week)"],
    notes: obj.unnamed_11,
  };
}

function cleanCell(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function display(value) {
  return value && value.length ? value : "Not provided";
}

function buildDirectory(sheet, records) {
  const titleRange = sheet.getRange("A1:K1");
  titleRange.merge();
  titleRange.values = [["2026 September MSc and Intern Profiles"]];
  titleRange.format = {
    fill: "#17324D",
    font: { name: "Aptos Display", size: 16, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };

  const summary = sheet.getRange("A2:K2");
  summary.merge();
  summary.values = [[`Structured profiles generated from the source workbook. Total people listed: ${records.length}.`]];
  summary.format = {
    fill: "#EAF1F7",
    font: { name: "Aptos", size: 10, color: "#1F2937", italic: true },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };

  const header = [
    "No.",
    "Name",
    "Role",
    "Supervisor",
    "Project area",
    "Project title",
    "Period",
    "Lab attendance",
    "Overleaf",
    "GitHub text",
    "Notes",
  ];
  const rows = records.map((record, index) => [
    index + 1,
    display(record.name),
    display(record.role),
    display(record.supervisor),
    display(record.area),
    display(record.title),
    display(record.period),
    display(record.labDays),
    display(record.overleaf),
    display(record.githubText || record.githubCode),
    display(record.notes),
  ]);

  const tableRange = sheet.getRange(`A4:K${4 + rows.length}`);
  tableRange.values = [header, ...rows];
  tableRange.format = {
    font: { name: "Aptos", size: 10, color: "#111827" },
    borders: { preset: "all", style: "thin", color: "#D9E2EC" },
    verticalAlignment: "top",
    wrapText: true,
  };
  tableRange.getRow(0).format = {
    fill: "#2F5D7C",
    font: { name: "Aptos", size: 10, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };

  for (let i = 0; i < rows.length; i += 1) {
    if (i % 2 === 1) {
      sheet.getRange(`A${5 + i}:K${5 + i}`).format.fill = "#F8FAFC";
    }
  }
  sheet.getRange(`A5:A${4 + rows.length}`).format.horizontalAlignment = "center";
  sheet.getRange(`B5:B${4 + rows.length}`).format.font = { bold: true };
  sheet.getRange("A:K").format.autofitColumns();
  sheet.getRange("A1:K2").format.autofitRows();
  tableRange.format.autofitRows();
  sheet.freezePanes.freezeRows(4);
}

function buildProfiles(sheet, records) {
  const titleRange = sheet.getRange("A1:H1");
  titleRange.merge();
  titleRange.values = [["Student Profile Cards"]];
  titleRange.format = {
    fill: "#17324D",
    font: { name: "Aptos Display", size: 16, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };

  const noteRange = sheet.getRange("A2:H2");
  noteRange.merge();
  noteRange.values = [["Profiles use only information present in the source workbook; missing fields are marked as Not provided."]];
  noteRange.format = {
    fill: "#EAF1F7",
    font: { name: "Aptos", size: 10, color: "#1F2937", italic: true },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };

  let row = 4;
  records.forEach((record, index) => {
    const cardStart = row;
    const cardEnd = row + 10;

    const cardRange = sheet.getRange(`A${cardStart}:H${cardEnd}`);
    cardRange.format = {
      fill: "#FFFFFF",
      font: { name: "Aptos", size: 10, color: "#111827" },
      borders: { preset: "outside", style: "thin", color: "#9FB4C7" },
      verticalAlignment: "top",
      wrapText: true,
    };

    const nameRange = sheet.getRange(`A${row}:H${row}`);
    nameRange.merge();
    nameRange.values = [[`${index + 1}. ${display(record.name)}`]];
    nameRange.format = {
      fill: "#2F5D7C",
      font: { name: "Aptos Display", size: 13, color: "#FFFFFF", bold: true },
      horizontalAlignment: "left",
      verticalAlignment: "center",
    };
    row += 1;

    const summaryRange = sheet.getRange(`A${row}:H${row}`);
    summaryRange.merge();
    summaryRange.values = [[makeSummary(record)]];
    summaryRange.format = {
      fill: "#F8FAFC",
      font: { name: "Aptos", size: 10, color: "#1F2937" },
      borders: { preset: "outside", style: "thin", color: "#D9E2EC" },
      wrapText: true,
      verticalAlignment: "top",
    };
    row += 1;

    const details = [
      ["Role", display(record.role), "Supervisor", display(record.supervisor)],
      ["Project area", display(record.area), "Project title", display(record.title)],
      ["Period", display(record.period), "Lab attendance", display(record.labDays)],
      ["Overleaf", display(record.overleaf), "GitHub text", display(record.githubText)],
      ["GitHub code", display(record.githubCode), "Notes", display(record.notes)],
      ["Source row", record.sourceRow, "Data status", dataStatus(record)],
    ];

    const detailsRange = sheet.getRange(`A${row}:H${row + details.length - 1}`);
    detailsRange.values = details.map(([l1, v1, l2, v2]) => [l1, v1, null, null, l2, v2, null, null]);
    detailsRange.format = {
      font: { name: "Aptos", size: 10, color: "#111827" },
      borders: { preset: "all", style: "thin", color: "#E5E7EB" },
      verticalAlignment: "top",
      wrapText: true,
    };

    for (let detailRow = row; detailRow < row + details.length; detailRow += 1) {
      sheet.getRange(`B${detailRow}:D${detailRow}`).merge();
      sheet.getRange(`F${detailRow}:H${detailRow}`).merge();
      sheet.getRange(`A${detailRow}:A${detailRow}`).format = labelFormat();
      sheet.getRange(`E${detailRow}:E${detailRow}`).format = labelFormat();
    }

    row += details.length + 2;
  });

  sheet.getRange("A:H").format.autofitColumns();
  sheet.getRange(`A1:H${row}`).format.autofitRows();
  sheet.freezePanes.freezeRows(2);
}

function labelFormat() {
  return {
    fill: "#EEF4F8",
    font: { name: "Aptos", size: 10, color: "#17324D", bold: true },
    horizontalAlignment: "left",
    verticalAlignment: "top",
    wrapText: true,
  };
}

function makeSummary(record) {
  const role = display(record.role);
  const supervisor = display(record.supervisor);
  const area = display(record.area);
  const title = display(record.title);
  return `${display(record.name)} is listed as ${role}. Supervisor: ${supervisor}. Project area: ${area}. Project title: ${title}.`;
}

function dataStatus(record) {
  const fields = [
    record.role,
    record.supervisor,
    record.area,
    record.title,
    record.period,
    record.labDays,
    record.overleaf,
    record.githubText,
    record.githubCode,
    record.notes,
  ];
  const missing = fields.filter((value) => !value).length;
  const uncertain = fields.some((value) => value.includes("?"));
  if (missing === 0 && !uncertain) return "Complete from source";
  if (uncertain) return "Contains source uncertainty";
  return "Missing source fields";
}

function buildSource(sheet, sourceValues) {
  const rows = sourceValues.length;
  const cols = sourceValues[0].length;
  const endCol = columnName(cols);
  const range = sheet.getRange(`A1:${endCol}${rows}`);
  range.values = sourceValues;
  range.format = {
    font: { name: "Aptos", size: 10, color: "#111827" },
    borders: { preset: "all", style: "thin", color: "#E5E7EB" },
    verticalAlignment: "top",
    wrapText: true,
  };
  range.getRow(0).format = {
    fill: "#2F5D7C",
    font: { name: "Aptos", size: 10, color: "#FFFFFF", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  sheet.getRange(`A:${endCol}`).format.autofitColumns();
  range.format.autofitRows();
  sheet.freezePanes.freezeRows(1);
}

function columnName(index) {
  let n = index;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

async function verifyWorkbook(workbook) {
  const directoryCheck = await workbook.inspect({
    kind: "table",
    range: "Directory!A1:K12",
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 11,
    maxChars: 8000,
  });
  console.log(directoryCheck.ndjson);

  const profileCheck = await workbook.inspect({
    kind: "table",
    range: "Profiles!A1:H16",
    include: "values,formulas",
    tableMaxRows: 16,
    tableMaxCols: 8,
    maxChars: 8000,
  });
  console.log(profileCheck.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan",
    maxChars: 4000,
  });
  console.log(errors.ndjson);

  await workbook.render({ sheetName: "Directory", range: "A1:K18", scale: 2 });
  await workbook.render({ sheetName: "Profiles", range: "A1:H26", scale: 2 });
  await workbook.render({ sheetName: "Source Data", range: "A1:K18", scale: 2 });
}
