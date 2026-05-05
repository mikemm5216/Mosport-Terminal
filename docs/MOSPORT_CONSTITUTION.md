# Mosport Constitution

Version: v1.0
Status: Binding Product Constitution
Base Repo: `mikemm5216/Mosport-Terminal`

This document is the highest-level product and engineering constitution for Mosport. Any future feature, UI, API, model, agent, ingestion pipeline, or product copy must follow this constitution unless this document is explicitly amended.

---

## 1. Core Identity

Mosport is not a sportsbook, betting product, live wagering tool, quant trading terminal, or generic sports score app.

Mosport is a **pregame Keyboard Coach platform**.

Mosport lets fans act like coaches before the game starts: read the matchup, debate the coaching decision, vote, comment, and then come back after the game to see who was right.

Core product sentence:

> Pregame coaching debates for sports fans.

Chinese positioning:

> Mosport 是讓球迷在賽前上場當教練的 AI 鍵盤教練平台。

Brand line:

> 賽前當教練，賽中看打臉，賽後論輸贏。

---

## 2. Product Formula

Mosport follows this product flow:

```txt
Pregame:
Raw Data → Validated Data → World Engine → Coach Read → Fan Vote / Comment

Live:
Locked Pregame Coach Read → Live Follow Only → Fan Discussion

Postgame:
Final Result → Postgame Verdict → Keyboard Coach Reputation
```

---

## 3. Pregame-Only Rule

Mosport only generates analysis before the game starts.

Once a game starts, all public-facing Coach Reads must be locked.

During live games, Mosport must not generate or update:

- new Coach Reads
- live predictions
- live win probability
- live edge
- live betting-style recommendations
- in-play decision advice
- market-movement-based prompts
- any wagering or chase-style suggestion

Live games are **follow-only**.

Allowed during live games:

- current score
- sport-specific game status
- game clock / period / inning / match minute
- locked pregame Coach Read recap
- fan vote recap
- comments
- user's pregame vote
- postgame verdict pending state

Live CTA examples:

- View Pregame Read
- Comment
- Follow Postgame Verdict

Forbidden live CTA examples:

- Re-analyze
- Live Prediction
- Live Edge
- Updated Coach Advice
- Now is the time to...

---

## 4. Analysis Phases

All analysis must use this phase model:

```ts
export type AnalysisPhase =
  | "PREGAME_OPEN"
  | "PREGAME_LOCKED"
  | "LIVE_FOLLOW_ONLY"
  | "POSTGAME_VERDICT";
```

### PREGAME_OPEN

Allowed:

- generate Coach Read
- derive World Engine Evidence
- open fan vote
- open comments
- display coaching debate

### PREGAME_LOCKED

Triggered before start time, at start time, or by explicit locking policy.

Required behavior:

- Coach Read is locked
- public recommendation no longer mutates
- generatedAt and lockedAt must be visible or traceable

### LIVE_FOLLOW_ONLY

Triggered when the game is live.

Allowed:

- update score
- update clock/status
- show locked Coach Read
- show vote recap
- allow comments

Forbidden:

- generateCoachRead()
- updateCoachRead()
- recalculatePredictionForPublic()
- generateLiveEdge()
- generateLiveCoachAdvice()

### POSTGAME_VERDICT

Triggered when the game is final/completed.

Allowed:

- compare final result against locked pregame Coach Read
- produce HIT / MISS / PARTIAL verdict
- update fan and keyboard coach reputation

Forbidden:

- rewriting the locked pregame Coach Read
- pretending a postgame explanation was known pregame

---

## 5. Quantitative Data Rule

Mosport does not reject quantitative data.

Coaches need evidence. Data matters.

But raw quantitative data is not the public product. Quantitative data must be converted into world-engine interpretation and then into coach-readable judgment.

Correct flow:

```txt
Raw Data → Validated Game Facts → World Engine State → Coach Evidence → Coach Read → Keyboard Coach Debate
```

Default UI must not headline:

- win probability
- model edge
- market edge
- betting line
- total
- live probability
- sharp signal
- in-play movement

Default UI should headline:

- Coach Question
- Mosport Coach Read
- Why It Matters
- World Engine Evidence
- Opposing Coach View
- Fan Vote
- Comment / Debate

Quantitative and structured data may exist in:

- World Engine Evidence
- Coach Evidence
- Advanced Context
- Terminal Mode

Principle:

> Quant is engine. Feeling is product. Keyboard coach is community.

Chinese:

> 量化做底，感化做面，鍵盤教練做社群。

---

## 6. World Engine Rule

The World Engine is the core interpretation layer.

The World Engine does not merely display statistics. It translates validated sports facts into coach-useful game-state meaning.

Core world-state dimensions:

- pressure
- fatigue
- volatility
- momentum
- mismatch
- rotationRisk
- tempoControl
- benchStability
- starLoad
- foulTroubleRisk
- lineupTrust
- coachPanicIndex
- lateGameFragility
- emotionalSwing
- collapseRisk
- defensiveStability
- offensiveFlow

World Engine output must answer:

> What is the most meaningful coaching question before this game?

Examples:

- Should the coach compress the rotation?
- Should the coach attack a specific mismatch?
- Should the team slow the tempo?
- Should the coach protect a foul-trouble risk?
- Should the team play small?
- Should the team double the opposing star?

---

## 7. Coach Read Rule

A Coach Read is not a betting prediction.

A Coach Read is a pregame coaching judgment.

Every Coach Read should include:

- matchup
- analysis phase
- generatedAt
- lockedAt when applicable
- `generatedBeforeStart: true`
- `isPregameOnly: true`
- coach question
- coach decision
- coach read
- emotional hook
- why it matters
- world engine evidence
- opposing coach view
- fan prompt
- vote summary when available

Coach Read examples:

- Should LAL compress the rotation early?
- Should BOS double Brunson from the left elbow?
- Should NYY go to the bullpen earlier than usual?
- Should Arsenal press high in the first 20 minutes?

---

## 8. Fan Interaction Rule

Fan vote and comment are core product features, not secondary UI.

Every pregame Coach Read card must make voting and commenting visually prominent.

Required vote options:

- Agree
- Disagree
- I have another call
- Watch only

Chinese:

- 同意
- 不同意
- 我有別招
- 先看戲

Fan interaction should write to:

- CoachDecisionVote
- MatchComment
- UserEventLog

Fan interaction creates the Keyboard Coach community loop.

---

## 9. Data Safety Rule

Real player names may only be shown if player-team validation passes.

Required rule:

```txt
player.teamId === displayedTeam.teamId
```

If validation fails, do not display the real player name. Use a neutral role placeholder.

Forbidden examples:

- LAL showing J. Embiid
- HOU showing D. Mitchell
- any real-name player appearing on the wrong displayed team

Neutral placeholders:

Basketball:

- Primary Scorer
- Key Starter
- Rotation Guard
- Defensive Anchor
- Bench Creator
- Rim Protector

Baseball:

- Starting Pitcher
- Bullpen Arm
- Power Bat
- Contact Hitter
- Defensive Specialist

Soccer:

- Midfield Creator
- Striker
- Wide Threat
- Defensive Anchor
- Keeper

Hockey:

- Top Line Forward
- Blue Line Anchor
- Power Play Unit
- Netminder

---

## 10. Live Status Rule

Live status is allowed only for follow mode, not for live analysis.

Required sport-specific display:

- NBA: quarter + clock
- MLB: inning + top/bottom
- EPL: match minute + stoppage time
- NHL: period + clock
- NFL: quarter + clock

Live status exists to help fans follow the game and compare reality against the locked pregame read.

---

## 11. UI Language Rule

Default product copy must feel like sports media, coaching debate, and fan argument.

Default product copy must not feel like trading, betting, or investment advice.

Replace or avoid these terms in the public UI:

| Avoid | Use Instead |
|---|---|
| Sports Intelligence Terminal | Keyboard Coach Arena |
| Operational Dashboard | Today’s Coach Room |
| Market Nodes | Games / Coach Rooms |
| Model View | Mosport Coach Read |
| Model Edge | Coach Lean |
| Market Consensus | Fan Consensus / Public Read |
| Signal | Coach Clue |
| Prediction | Coach Read |
| Analytics Panel | Coach Board |
| Add to Watchlist | Follow This Debate |
| High-Intel Flags | Hot Coach Debates |
| Engine Confidence | Read Stability |
| Edge Filter | Debate Intensity |
| Consensus Board | Fan Vote Board |
| Trend | Game Flow |
| Live Prediction | Forbidden |
| Live Edge | Forbidden |
| Re-analyze during live | Forbidden |

---

## 12. Public Homepage Rule

The public homepage `/` must not be an ingest-worker health page, admin page, or operational dashboard.

The public homepage should make users understand within five seconds:

> I am here to be a keyboard coach before the game.

Required homepage concepts:

- Today’s Coach Room
- Hot Coach Debates
- Pregame Voting
- Locked Reads Waiting for Results
- Postgame Verdicts
- Top Keyboard Coaches

Admin/worker status belongs under admin routes or API health routes, not the public homepage.

---

## 13. Terminal Mode Rule

Terminal Mode may exist for advanced users.

Terminal Mode may expose deeper world-engine numbers, raw context, model metadata, provider health, and debugging information.

But Terminal Mode must not become the default public experience.

The default public experience is Keyboard Coach.

---

## 14. Data Challenge Rule

Data Challenge is a core trust feature.

Users must be able to report:

- wrong player team
- wrong roster
- wrong score/status
- wrong jersey
- wrong logo
- bad coach decision
- UI bug
- other data issues

DataChallengeReport must be treated as a first-class feedback loop.

---

## 15. Postgame Verdict Rule

Postgame verdicts must evaluate only the locked pregame Coach Read.

Verdict types:

- HIT
- MISS
- PARTIAL

Postgame verdicts must not rewrite history.

Required framing:

> This Coach Read was locked before the game. Postgame only verifies it; it does not change the answer.

---

## 16. Hard Acceptance Criteria

### Product

- The homepage does not feel like a betting or investment terminal.
- The default UI clearly communicates Keyboard Coach identity.
- Every pregame game card contains a coach question.
- Vote and comment CTAs are visually prominent.

### Pregame Only

- No live game can create a new Coach Read.
- No live game can update a Coach Read.
- No live game can show live edge, live prediction, or live recommendation.
- Live games only show follow mode.
- Coach Reads include generatedAt, lockedAt, generatedBeforeStart, and isPregameOnly.

### Data Safety

- Real player names only appear after player-team validation.
- Wrong-team player rendering is forbidden.
- Missing roster falls back to neutral placeholders.
- Team logo must not break.
- Team keys must be league-prefixed.

### Live Status

- NBA shows quarter + clock.
- MLB shows inning + top/bottom.
- EPL shows minute + stoppage.
- NHL shows period + clock.
- NFL shows quarter + clock.

### Postgame

- Postgame verdict compares only against the locked pregame read.
- Verdict result is HIT / MISS / PARTIAL.
- Fan vote result remains reviewable.

---

## 17. Final North Star

Mosport is not here to tell people what to bet.

Mosport is here to let fans argue like coaches before the game, watch the game prove or destroy their take, and build reputation from being right.

Final product line:

> 賽前當教練，賽中看打臉，賽後論輸贏。
