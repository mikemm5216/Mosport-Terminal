import { runMatchCrawler } from "../crawlers/matchCrawler";
import { runStatsCrawler } from "../crawlers/statsCrawler";
import { runOddsCrawler } from "../crawlers/oddsCrawler";
import { runWorldState } from "../engine/worldState";
import { runQuantEngine } from "../engine/quantEngine";
import { runSignalEngine } from "../engine/signalEngine";

// Using Vercel Cron. These handlers will be called by GET /api/admin/engine or Vercel specific endpoints

export async function execute10MinJob() {
  console.log("Starting 10 Min Job...");
  await runMatchCrawler();
  await runAfterCrawlers();
}

export async function execute30MinJob() {
  console.log("Starting 30 Min Job...");
  await runStatsCrawler();
  await runAfterCrawlers();
}

export async function execute60MinJob() {
  console.log("Starting 60 Min Job...");
  await runOddsCrawler();
  await runAfterCrawlers();
}

// Ensure engines run after crawlers complete successfully (State Lock)
export async function runAfterCrawlers() {
  console.log("Running Engines...");
  await runWorldState();
  await runQuantEngine();
  await runSignalEngine();
  console.log("Engines completed.");
}
