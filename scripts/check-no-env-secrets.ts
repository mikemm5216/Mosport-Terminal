import fs from "fs";

const forbidden = [".env", ".env.local"];

for (const file of forbidden) {
  if (fs.existsSync(file)) {
    console.error(`Forbidden file: ${file}`);
    process.exit(1);
  }
}

console.log("OK: no local env files committed");
