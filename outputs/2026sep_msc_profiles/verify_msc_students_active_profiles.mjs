import fs from "node:fs/promises";

const root = "/Users/m.diluca@bham.ac.uk/GitHub/virtualrealitylab/content/authors";

const expected = [
  ["Allen, George", "P_George_Philip_Allen"],
  ["Goswami, Naveen", "P_Naveen_Goswami"],
  ["Chen, Mengkai", "P_Mengkai_Chen"],
  ["Wright, Dwayne", "P_Dwayne_Wright"],
  ["Judson Brabu, Jerlin", "P_Jerlin_Judson_Brabu"],
  ["Amal Alomari", "P_Amal_Alomari"],
  ["Rai, Sandeep", "P_Sandeep_Rai"],
  ["Nimisha, Naina", "P_Naina_Nimisha"],
  ["Vaishali Veera Saravana Perumal", "P_Vaishali_Veera_Saravana_Perumal"],
  ["Pragadheeswaran Ganapathy", "P_Pragadheeswaran_Ganapathy"],
  ["Rong Wang", "P_Rong_Wang"],
  ["Jiajun", "P_Jiajun"],
  ["Jasmin (Kamal-Deen Gbontaa)", "P_Jasmin_Kamal-Deen_Gbontaa"],
  ["Pin Yen Chen", "P_Pin_Yen_Chen"],
  ["Guohao Ma", "P_Guohao_Ma"],
  ["Jhundon De Leon Mendi", "P_Jhundon_De_Leon_Mendi"],
  ["Akbar Juraev", "P_Akbar_Juraev"],
  ["Kika Okwubuasi-Andrew", "P_Kika_Okwubuasi-Andrew"],
  ["Siyu Chen", "P_Siyu_Chen"],
];

const results = [];
for (const [sourceName, folder] of expected) {
  const file = await profileFile(folder);
  const text = file ? await fs.readFile(file, "utf8") : "";
  const groups = extractGroups(text);
  results.push({
    sourceName,
    folder,
    file,
    exists: Boolean(file),
    groups,
    isProjectStudent: groups.includes("Project Students"),
    hasAlumniGroup: groups.some((group) => group.startsWith("Alumni")),
    hasBody: Boolean(text.replace(/^---\n[\s\S]*?\n---\s*/, "").trim()),
  });
}

const failures = results.filter((result) =>
  !result.exists || !result.isProjectStudent || result.hasAlumniGroup || !result.hasBody
);

console.log(JSON.stringify({ checked: results.length, failures, results }, null, 2));
if (failures.length) process.exitCode = 1;

async function profileFile(folder) {
  for (const name of ["_index.md", "index.md"]) {
    const file = `${root}/${folder}/${name}`;
    try {
      await fs.access(file);
      return file;
    } catch {
      // Try the next conventional profile filename.
    }
  }
  return "";
}

function extractGroups(text) {
  const frontMatter = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatter) return [];
  const lines = frontMatter[1].split(/\r?\n/);
  const groups = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^user_groups:\s*$/.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[j])) break;
      const match = lines[j].match(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/);
      if (match) groups.push(match[1].trim());
    }
  }
  return groups;
}
