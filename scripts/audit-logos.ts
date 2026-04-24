import fs from "node:fs";
import path from "node:path";

import { getCanonicalTeamLogoKey, normalizeTeamCode } from "../src/config/teamCodeNormalization";
import { TEAM_LOGOS, getTeamLogo } from "../src/config/teamLogos";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function isCanonicalKey(key: string): boolean {
  return /^[A-Z0-9]+_[A-Z0-9]+$/.test(key);
}

function main(): void {
  const publicDir = path.join(process.cwd(), "public");
  const keys = Object.keys(TEAM_LOGOS);
  const bareKeys = keys.filter((key) => !key.includes("_"));

  assert(bareKeys.length === 0, `Bare TEAM_LOGOS keys found: ${bareKeys.join(", ")}`);

  const invalidKeys = keys.filter((key) => !isCanonicalKey(key));
  assert(invalidKeys.length === 0, `Invalid canonical keys: ${invalidKeys.join(", ")}`);

  for (const [canonicalKey, logoPath] of Object.entries(TEAM_LOGOS)) {
    const normalizedPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
    const absolutePath = path.join(publicDir, normalizedPath);
    assert(fs.existsSync(absolutePath), `Missing logo asset for ${canonicalKey}: ${logoPath}`);
  }

  const samples: Array<{ league: string; rawCode: string; expected: string }> = [
    { league: "MLB", rawCode: "LA", expected: "MLB_LAD" },
    { league: "MLB", rawCode: "SF", expected: "MLB_SFG" },
    { league: "MLB", rawCode: "NY", expected: "MLB_NYY" },
    { league: "NBA", rawCode: "LA", expected: "NBA_LAL" },
    { league: "NBA", rawCode: "GS", expected: "NBA_GSW" },
  ];

  for (const sample of samples) {
    const normalizedCode = normalizeTeamCode(sample.league, sample.rawCode);
    const canonicalKey = getCanonicalTeamLogoKey(sample.league, sample.rawCode);
    const logoPath = getTeamLogo(sample.league, sample.rawCode);

    assert(canonicalKey === sample.expected, `Expected ${sample.league} ${sample.rawCode} -> ${sample.expected}, got ${canonicalKey}`);
    assert(TEAM_LOGOS[canonicalKey] === logoPath, `Resolver mismatch for ${canonicalKey}`);
    assert(normalizedCode === sample.expected.split("_")[1], `Normalization mismatch for ${sample.league} ${sample.rawCode}`);
  }

  console.log("Logo audit passed.");
  console.log(`Checked ${keys.length} TEAM_LOGOS entries.`);
}

main();
