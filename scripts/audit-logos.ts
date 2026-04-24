import fs from "node:fs";
import path from "node:path";

import { getCanonicalTeamLogoKey, normalizeTeamCode } from "../src/config/teamCodeNormalization";
import { TEAM_LOGOS, getTeamLogo } from "../src/config/teamLogos";
import { getTeamLogo as getFrontendTeamLogo, TEAM_LOGO_FALLBACK as FRONTEND_FALLBACK } from "../frontend/app/lib/teamLogoResolver";
import { getTeamLogo as getServerTeamLogo, TEAM_LOGO_FALLBACK as SERVER_FALLBACK } from "../lib/teamLogoResolver";

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
    { league: "MLB", rawCode: "CWS", expected: "MLB_CHW" },
    { league: "MLB", rawCode: "TB", expected: "MLB_TBR" },
    { league: "MLB", rawCode: "KC", expected: "MLB_KCR" },
    { league: "NHL", rawCode: "LA", expected: "NHL_LAK" },
    { league: "EPL", rawCode: "NOT", expected: "EPL_NFO" },
    { league: "EPL", rawCode: "MAN_UNITED", expected: "EPL_MUN" },
    { league: "UCL", rawCode: "PSG", expected: "UCL_PSG" },
  ];

  for (const sample of samples) {
    const normalizedCode = normalizeTeamCode(sample.league, sample.rawCode);
    const canonicalKey = getCanonicalTeamLogoKey(sample.league, sample.rawCode);
    const logoPath = getTeamLogo(sample.league, sample.rawCode);

    assert(canonicalKey === sample.expected, `Expected ${sample.league} ${sample.rawCode} -> ${sample.expected}, got ${canonicalKey}`);
    assert(TEAM_LOGOS[canonicalKey] === logoPath, `Resolver mismatch for ${canonicalKey}`);
    assert(normalizedCode === sample.expected.split("_")[1], `Normalization mismatch for ${sample.league} ${sample.rawCode}`);
  }

  const knownRealTeams: Array<{ key: string; league: "MLB" | "NBA" | "EPL" | "NHL" | "UCL"; rawCode: string }> = [
    { key: "MLB_CHW", league: "MLB", rawCode: "CHW" },
    { key: "MLB_SFG", league: "MLB", rawCode: "SF" },
    { key: "MLB_PIT", league: "MLB", rawCode: "PIT" },
    { key: "MLB_TEX", league: "MLB", rawCode: "TEX" },
    { key: "MLB_LAD", league: "MLB", rawCode: "LAD" },
    { key: "MLB_NYY", league: "MLB", rawCode: "NYY" },
    { key: "NBA_TOR", league: "NBA", rawCode: "TOR" },
    { key: "NBA_MIN", league: "NBA", rawCode: "MIN" },
    { key: "NBA_DEN", league: "NBA", rawCode: "DEN" },
    { key: "NBA_CLE", league: "NBA", rawCode: "CLE" },
    { key: "EPL_NFO", league: "EPL", rawCode: "NFO" },
    { key: "EPL_SUN", league: "EPL", rawCode: "SUN" },
    { key: "EPL_ARS", league: "EPL", rawCode: "ARS" },
    { key: "EPL_LIV", league: "EPL", rawCode: "LIV" },
    { key: "EPL_MCI", league: "EPL", rawCode: "MCI" },
    { key: "NHL_LAK", league: "NHL", rawCode: "LA" },
    { key: "NHL_COL", league: "NHL", rawCode: "COL" },
    { key: "NHL_BUF", league: "NHL", rawCode: "BUF" },
    { key: "NHL_BOS", league: "NHL", rawCode: "BOS" },
    { key: "UCL_PSG", league: "UCL", rawCode: "PSG" },
    { key: "UCL_MUN", league: "UCL", rawCode: "MUN" },
  ];

  for (const sample of knownRealTeams) {
    const logoPath = TEAM_LOGOS[sample.key];
    assert(Boolean(logoPath), `Missing TEAM_LOGOS key: ${sample.key}`);

    const normalizedPath = logoPath.startsWith("/") ? logoPath.slice(1) : logoPath;
    const absolutePath = path.join(publicDir, normalizedPath);
    assert(fs.existsSync(absolutePath), `Missing logo file for ${sample.key}: ${logoPath}`);

    const frontendResolved = getFrontendTeamLogo(sample.league, sample.rawCode);
    const serverResolved = getServerTeamLogo(sample.league, sample.rawCode);
    const srcResolved = getTeamLogo(sample.league, sample.rawCode);

    assert(frontendResolved !== FRONTEND_FALLBACK, `Frontend resolver fell back for ${sample.key}`);
    assert(serverResolved !== SERVER_FALLBACK, `Server resolver fell back for ${sample.key}`);
    assert(srcResolved === logoPath, `Source resolver mismatch for ${sample.key}`);
    assert(frontendResolved === logoPath, `Frontend resolver mismatch for ${sample.key}`);
    assert(serverResolved === logoPath, `Server resolver mismatch for ${sample.key}`);
  }

  console.log("Logo audit passed.");
  console.log(`Checked ${keys.length} TEAM_LOGOS entries.`);
}

main();
