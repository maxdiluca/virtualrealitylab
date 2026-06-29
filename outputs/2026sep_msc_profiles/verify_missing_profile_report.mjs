import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const reportPath = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles/induction-missing-profile-check.xlsx";
const input = await FileBlob.load(reportPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 10,
  tableMaxCellChars: 100,
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  maxChars: 4000,
});
console.log(errors.ndjson);

await workbook.render({ sheetName: "Summary", range: "A1:B8", scale: 2 });
await workbook.render({ sheetName: "Missing from Sheet1", range: "A1:G20", scale: 2 });
await workbook.render({ sheetName: "All Sheet1 comparison", range: "A1:H20", scale: 2 });
await workbook.render({ sheetName: "Sheet2 comparison", range: "A1:F20", scale: 2 });
await workbook.render({ sheetName: "Existing profiles", range: "A1:D20", scale: 2 });
