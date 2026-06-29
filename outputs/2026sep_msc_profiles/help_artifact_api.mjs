import { Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
for (const query of [
  "range.format",
  "range.values",
  "worksheet.addTable",
  "sheet.freezePanes",
  "worksheet.freezePanes",
  "range.merge",
  "range.borders",
  "range.columnWidthPx",
  "*",
]) {
  const options = query === "*"
    ? { search: "table|columnWidth|rowHeight|gridlines", include: "index,examples,notes", maxChars: 10000 }
    : { include: "index,examples,notes", maxChars: 4000 };
  const help = await workbook.help(query, options);
  console.log(`\n## ${query}`);
  console.log(help.ndjson);
}
