import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/m.diluca@bham.ac.uk/Library/CloudStorage/OneDrive-SharedLibraries-UniversityofBirmingham/VRLab - Documents/VR Lab Induction 1.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 20000,
  tableMaxRows: 20,
  tableMaxCols: 20,
  tableMaxCellChars: 120,
});

console.log(summary.ndjson);
