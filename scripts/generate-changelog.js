const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const historyPath = path.join(root, "src/data/version-history.ts");
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function readHistory(source) {
  const output = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
  const exports = {};
  new Function("exports", output)(exports);
  return exports;
}

function nextVersion(version, bump) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error("目前版本必須符合 MAJOR.MINOR.PATCH");
  }
  const [major, minor, patch] = version.split(".").map(Number);
  return { major: [major + 1, 0, 0], minor: [major, minor + 1, 0], patch: [major, minor, patch + 1] }[bump].join(".");
}

function checkEntry(entry, sections) {
  if (!entry?.title?.trim() || !entry.summary?.trim()) throw new Error("請填寫版本標題和摘要");
  if (!entry.changes || Object.keys(entry.changes).length !== sections.length ||
      sections.some(([key]) => !Array.isArray(entry.changes[key]) ||
        entry.changes[key].some(item => typeof item !== "string" || !item.trim()))) {
    throw new Error("請提供 added、improved、fixed 三個項目清單");
  }
  if (!sections.some(([key]) => entry.changes[key].length)) throw new Error("請至少填寫一筆更新");
}

function notes(entry, sections) {
  checkEntry(entry, sections);
  return [
    "# " + entry.title,
    entry.date,
    entry.summary,
    ...sections.filter(([key]) => entry.changes[key].length).flatMap(([key, label]) =>
      ["## " + label, entry.changes[key].map(item => "- " + item).join("\n")]),
  ].join("\n\n") + "\n";
}

function main() {
  const [command, input] = process.argv.slice(2);
  const source = fs.readFileSync(historyPath, "utf8");
  const { VERSION_HISTORY: [latest], RELEASE_SECTIONS: sections } = readHistory(source);
  const manifest = readJson(packagePath);
  const lock = readJson(lockPath);
  if (command === "--notes" || command === "--check") {
    if (latest.version !== manifest.version || latest.version !== lock.version || latest.version !== lock.packages[""].version) {
      throw new Error("網站版本紀錄與套件版本需一致");
    }
    checkEntry(latest, sections);
    if (command === "--notes") process.stdout.write(notes(latest, sections));
    return;
  }
  if (!["major", "minor", "patch"].includes(command) || !input) {
    throw new Error("用法 npm run release -- <major|minor|patch> <notes.json>");
  }

  const { title, summary, changes } = readJson(path.resolve(input));
  const version = nextVersion(latest.version, command);
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
  const entry = { id: "release-" + version, version, label: "更新項目", date, title, summary, changes };
  checkEntry(entry, sections);
  const marker = "export const VERSION_HISTORY: VersionHistoryEntry[] = [";
  if (!source.includes(marker)) throw new Error("找不到版本紀錄區段");
  const formatted = JSON.stringify(entry, null, 2).split("\n").map(line => "  " + line).join("\n");
  fs.writeFileSync(historyPath, source.replace(marker, () => marker + "\n" + formatted + ","));
  manifest.version = lock.version = lock.packages[""].version = version;
  for (const [file, content] of [[packagePath, manifest], [lockPath, lock]]) {
    fs.writeFileSync(file, JSON.stringify(content, null, 2) + "\n");
  }
  console.log("已準備 v" + version);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
