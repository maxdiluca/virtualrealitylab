import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/m.diluca@bham.ac.uk/Downloads/02_Teaching_Admin_and_Student_Work/2026Sep-MSc.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 20000,
  tableMaxRows: 30,
  tableMaxCols: 15,
  tableMaxCellChars: 160,
});

console.log(summary.ndjson);
