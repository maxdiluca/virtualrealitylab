import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputPath = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/outputs/2026sep_msc_profiles/2026Sep-MSc-student-profiles.xlsx";
const input = await FileBlob.load(outputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 8,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  maxChars: 4000,
});
console.log(errors.ndjson);
