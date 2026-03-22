import { WorldEngine, TeamStats } from "../lib/world-engine";

const teamA: TeamStats = {
  id: "team_a",
  name: "Lakers", // Team A (Away)
  shortName: "LAL",
  momentum: 1.0, // 5W Streak
  strength: 0.8,
  fatigue: 0.9,  // Critical Fatigue
  history: [
    { result: 'W', date: new Date() },
    { result: 'W', date: new Date() },
    { result: 'W', date: new Date() },
    { result: 'W', date: new Date() },
    { result: 'W', date: new Date() },
  ]
};

const teamB: TeamStats = {
  id: "team_b",
  name: "Magic", // Team B (Home)
  shortName: "ORL",
  momentum: 0.2, // 4L Streak
  strength: 0.4,
  fatigue: 0.1,  // Fully Rested
  history: [
    { result: 'L', date: new Date() },
    { result: 'L', date: new Date() },
    { result: 'L', date: new Date() },
    { result: 'L', date: new Date() },
  ]
};

console.log("=== WORLD ENGINE AUDIT START ===");
console.log("Scenario: LAL (1.0 Mom, 0.9 Fat) vs ORL (0.2 Mom, 0.1 Fat)");
console.log("");

// TEST 1: Force Favorite (Team A / Away)
const test1 = WorldEngine.runMatchSimulation(teamB, teamA, 'away');
console.log("--- TEST 1: FORCED FAVORITE (TEAM A WINS) ---");
console.log("PREDICTION: AWAY (Lakers)");
console.log(`TAG: ${test1.primaryTag}`);
console.log(`NARRATIVE: ${test1.narrative}`);
console.log("");

// TEST 2: Force Upset (Team B / Home)
const test2 = WorldEngine.runMatchSimulation(teamB, teamA, 'home');
console.log("--- TEST 2: FORCED UPSET (TEAM B WINS) ---");
console.log("PREDICTION: HOME (Magic)");
console.log(`TAG: ${test2.primaryTag}`);
console.log(`NARRATIVE: ${test2.narrative}`);
console.log("");
console.log("=== AUDIT COMPLETE ===");
