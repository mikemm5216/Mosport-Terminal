# Mosport World Engine Doctrine

Version: v1.0
Status: Binding Constitutional Doctrine
Parent Constitution: `docs/MOSPORT_CONSTITUTION.md`

This document defines the real Mosport game-analysis logic. It is binding for all future product, model, data, agent, UI copy, and single-game analysis work.

---

## 1. Universal Match Analysis Rule

Every Mosport analysis for any game must follow this doctrine.

Required flow:

```txt
Player Living State
+ Team Living State
+ Environment State
+ Matchup Collision
+ Event Chain Potential
→ World Line Simulation
→ Mosport Read
→ Keyboard Coach Translation
```

Forbidden:

- ad-hoc one-off reasoning
- result-first explanation
- generic team rolling average as the final answer
- raw feature dumping
- pretending baseline features are the World Engine
- unsupported invented narratives
- analyzing international games, playoff games, finals, or championship games with ordinary regular-season logic

Chinese:

> 以後 Mosport 跑任何一場比賽，都只能用這套世界引擎邏輯。
> 不准臨時自創邏輯，不准先有答案再補故事，不准把 team rolling average 包裝成 Mosport 結論。

---

## 2. Prime Formula

```txt
Historical Memory
× Event Streak Memory
× Player Bio-Psycho State
× Team Bio-Psycho State
× Player Matchups
× Team Matchups
× Environment State
→ World Engine Simulation
→ Mosport Read
→ Keyboard Coach Translation
```

Mosport is not using numbers to predict results. Mosport uses historical memory, repeated-event chains, player/team bio-psychological states, matchups, and environment to simulate world lines, then translates the read into Keyboard Coach language.

---

## 3. Quant-to-Feeling Rule

Quant is engine material, not the public product.

Required transformation:

```txt
data → living state → collision → environment amplification → event-chain potential → world-line read → keyboard coach language
```

Forbidden simplification:

```txt
team rolling average → prediction
```

Chinese:

> 量化不是拿來炫技，量化是拿來找到比賽裡真的發生過的連續現象。
> 感化不是不要數據，感化是把數據裡的世界變形講成人話。

---

## 4. Player Living State

The player layer asks: is this player still himself today?

Inputs include player historical data, event-streak data, biological state, psychological state, matchup history, and current role context.

Biological signals may include injury, rest, fatigue, workload, return-from-injury state, pitch count, recent usage, speed loss, pitch velocity, spin rate, exit velocity, sprint speed, acceleration load, and recovery indicators.

Psychological signals may include confidence streak, role stability, coach trust, pressure context, rivalry/revenge context, contract/trade context, clutch responsibility, national-team pressure, playoff pressure, final pressure, and championship pressure.

Output:

```txt
Player Daily Identity
```

---

## 5. Team Living State

The team layer asks: is this team still itself today?

Inputs include team historical data, event-streak data, team biological state, team psychological state, aggregated player living states, and coaching reaction history.

Team biological state may include schedule fatigue, back-to-back, three-in-four, travel, altitude, bullpen usage, goalie usage, rotation compression, player load concentration, bench survivability, tournament congestion, and short international windows.

Team psychological state may include losing streak pressure, standings urgency, playoff pressure, elimination pressure, championship pressure, final pressure, relegation pressure, rivalry/derby, national pride, revenge, coach pressure, favorite complacency, underdog desperation, and home crowd lift.

Output:

```txt
Team Daily Identity
```

---

## 6. Event Streak Memory: Miracle and Collapse

In Mosport:

```txt
Miracle / 神蹟 = positive repeated-event chain that can rewrite the game world
Collapse / 神敗績 = negative repeated-event chain that can break a team world
```

Examples include consecutive home runs, hits, walks, threes, fast breaks, turnovers forced, shots, corners, pressing recoveries, sacks, three-and-outs, goals allowed, failed zone exits, strikeouts, no-hit innings, missed shots, and penalties.

A streak must identify its trigger, sequence length, who triggered it, who was attacked, what stopped it, whether it resumed, and how it changed the world line.

---

## 7. Matchup Collision Layer

Mosport must analyze both player matchups and team matchups.

Collision Layer asks:

```txt
Who attacks whom?
Who gets repeatedly targeted?
Which individual matchup can open or close the world line?
Which team tendency amplifies the player matchup?
```

---

## 8. Environment State and Special Worlds

The World Engine must include the field, not only people and teams.

Environment is an amplifier, suppressor, or world-line transformer.

Environment includes weather, wind, temperature, altitude, field/court/ice condition, ballpark dimensions, venue familiarity, crowd noise, travel, timezone, neutral site, referee/umpire style, schedule position, series state, tournament context, market/public narrative context, and home/away crowd split.

Special worlds include:

- international games
- national-team duty
- playoffs
- elimination games
- finals
- championship games
- cup / knockout games
- neutral-site games
- short tournament rest windows

Special worlds must not be analyzed with ordinary regular-season logic.

---

## 9. Advanced Data Attachment

Mosport must support progressive data attachment.

L1 public data starts the engine. L2 advanced public or semi-public data deepens player/team state. L3 B2B professional data can attach later.

Advanced data must map into one of:

```txt
Player Living State
Team Living State
Environment State
Matchup Collision
Event Chain Potential
World Line Simulation
```

It must not become random feature slots.

---

## 10. World Line Outputs

The World Engine must produce world lines, not just a winner.

Required world-line categories:

- normal world line
- pressure world line
- chaos world line
- miracle world line
- collapse world line
- trap world line
- comeback world line
- garbage-time world line

A Mosport Read should explain who Mosport leans toward, why that is the normal read, which matchup matters, which event chain can rewrite the game, which collapse chain can break the read, which environment factor changes the world, and what live signal would confirm or invalidate the pregame read.

---

## 11. V15 / V16 Boundary

The current V15 real 2020-2024 train and 2025 out-of-sample backtest is a baseline smoke test.

It proves Mosport can ingest real historical data and run a reproducible out-of-sample comparison. It does not prove that the real Mosport World Engine is complete.

V15 must not be marketed as final World Engine, player bio-psycho simulation, team bio-psycho simulation, full miracle/collapse detection, full environment-aware simulation, or production sports intelligence.

V16 must reconstruct the pipeline around:

```txt
Player Living State
Team Living State
Environment State
Matchup Collision
Event Chain Potential
World Line Simulation
Keyboard Coach Translation
```

Acceptance:

- Do not call rolling team-history features the World Engine.
- Do not claim V15 baseline equals Mosport's real engine.
- Player states must exist before team state.
- Team state must be generated from player states plus team context.
- Environment must be part of the world line, not a footnote.
- International / playoff / championship games must use special-world logic.
- Miracle and collapse must mean repeated-event chains.
- Advanced/B2B data must map into the doctrine, not random feature slots.
