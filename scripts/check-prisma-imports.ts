import fs from "fs";
import path from "path";

const allowed = new Set([
  "lib/db/read.ts",
  "lib/db/write.ts",
]);

function walk(dir: string): string[] {
  try {
    return fs.readdirSync(dir).flatMap((file) => {
      const full = path.join(dir, file);
      if (full.includes("node_modules") || full.includes(".next") || full.includes(".git")) return [];
      if (fs.statSync(full).isDirectory()) return walk(full);
      return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
    });
  } catch {
    return [];
  }
}

let failed = false;

for (const file of walk(".")) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (allowed.has(normalized)) continue;
  if (normalized === "lib/prisma.ts") continue; // We'll phase this out, but script itself needs to run

  const content = fs.readFileSync(file, "utf8");

  if (content.includes("new PrismaClient(")) {
    console.error(`Forbidden new PrismaClient in ${normalized}`);
    failed = true;
  }

  if (content.includes("@/lib/prisma") || content.includes("../lib/prisma")) {
    // Exception for the migration of this task
    console.error(`Forbidden legacy prisma import in ${normalized}`);
    failed = true;
  }
}

if (failed) {
  console.log("\nRULE: Use prismaRead from @/lib/db/read or prismaWrite from @/lib/db/write instead.");
  process.exit(1);
}

console.log("Prisma import policy passed.");
