import fs from "fs";
import path from "path";

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
];

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
]);

function walk(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

let failed = false;

for (const file of walk(process.cwd())) {
  const content = fs.readFileSync(file, "utf8");

  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern);

    if (matches?.length) {
      console.error(`Possible secret found in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("Secret scan passed");
