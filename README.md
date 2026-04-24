# Mosport Terminal

## 🧠 Product Philosophy: Mosport is NOT a Betting Tool

Mosport is not a betting system, prediction engine, or odds optimization tool.

Mosport is a **Sports Decision Intelligence System**.

---

###  What Mosport is NOT

Mosport is NOT:

- A tool to predict who will win
- A betting assistant
- An odds optimization system
- A profit / ROI maximization engine

If users want betting tools, they should use platforms like Bet365.

Mosport does not compete in that category.

---

###  What Mosport IS

Mosport is a system that helps users understand:

- What is happening in the game right now
- Why the game state is shifting
- Which players or lineups are causing impact
- Whether the coach should:
  - keep the current lineup
  - adjust rotation
  - bench a player
  - attack a mismatch
- What is likely to happen if no change is made
- What may improve if adjustments are made

Mosport answers:

> "Should we change something right now, and why?"

---

### 🏀 Core System Architecture

Mosport is built on a **World Engine**:

World Engine Flow:

1. Player State Simulation
   - fatigue
   - pressure
   - momentum
   - collapse risk
   - role impact

2. Team State Simulation
   - lineup stability
   - offensive rhythm
   - defensive stress
   - mismatch exposure
   - rotation health

3. Game State Projection
   - current win chance
   - risk of collapse
   - stability of current lineup

4. Coach Decision Layer (DecisionPipelineAgent)
   - KEEP_LINEUP
   - ADJUST_ROTATION
   - BENCH_PLAYER
   - ATTACK_MISMATCH

---

### 🎯 Coach Mode Definition

Coach Mode does NOT output picks.

Coach Mode outputs decisions like a real coach:

- KEEP  current setup is acceptable
- ADJUST  something is off, small change needed
- BENCH  current player/strategy is hurting the team
- ATTACK  clear advantage, push harder

The goal is:

> Reduce bad decisions, not increase actions.

---

###  Role of Market / Odds Data

Market odds are used only as:

- A representation of public consensus
- A baseline expectation

They are NOT:
- the objective
- the optimization target
- the product output

Mosport uses market data as one signal among many,
not as the decision driver.

---

### 🧠 Key Principle

Mosport uses quantitative analysis internally.

But Mosport is NOT a quantitative betting system.

Mosport translates complex analysis into:

> sports-understandable decisions for fans and coaches

---

### 🔥 Product Goal

Mosport should feel like:

- A smart coach on the sideline
- Not a betting algorithm
- Not a spreadsheet

---

### 🚫 Engineering Guardrails

When building features:

DO:
- Think in terms of player impact, lineup dynamics, and game flow
- Explain decisions using sports language (fatigue, mismatch, rhythm)

DO NOT:
- optimize for betting outcomes
- expose raw probability as the main output
- design features around gambling use cases

---

### 🧭 One-line Summary

Mosport is not trying to tell you who wins.

Mosport tells you:

👉 whether you should change something in the game, and why.

## Environment Variables

Local development uses `.env.local` in the project root.

Copy:

```bash
cp .env.example .env.local
```

Fill values locally.

**Never commit `.env.local`.**

Production variables must be configured in Railway → Variables.

After changing `.env.local`, restart the dev server.

## Data Ingestion

### Hot Ingestion
To manually trigger hot data ingestion:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/ingest/hot" `
  -Method Post `
  -Headers @{ "x-ingest-secret" = "your_secret" }
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/admin/ingest/hot \
  -H "x-ingest-secret: your_secret"
```
