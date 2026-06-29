import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/m.diluca@bham.ac.uk/Downloads/2026Sep-MSc.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 10000,
  tableMaxRows: 12,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
});

console.log(summary.ndjson);
