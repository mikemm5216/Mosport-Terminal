# Mosport Data Canon v1.0

This document defines the official data structure and ingestion policy for the Mosport system.

All crawlers and engines must follow this specification.
No data may enter the system unless it conforms to this standard.

---

## Core Principle

Mosport is designed to simulate and analyze sports matches using structured data.

Therefore:
Data must be consistent, normalized, and comparable across leagues and sports.

---

## Supported Sports (Phase 1)

Mosport v1 supports three sports.

- Basketball
- Football (soccer)
- Baseball

Additional sports may be added in later phases.

---

## Supported Leagues (Phase 1)

Initial focus is Asia and major global leagues.

**Basketball**
- P. League+ (Taiwan)
- B.League (Japan)
- NBA

**Football**
- J.League
- K League
- English Premier League

**Baseball**
- NPB (Japan)
- CPBL (Taiwan)
- MLB

Each league must be defined in the database with:
- `league_id`
- `name`
- `sport`
- `country`

---

## Core Data Entities

Mosport uses five primary entities.

- League
- Team
- Player
- Match
- MatchStats

These entities form the base of the data model.

---

## League Data Structure

Fields:
- `league_id`
- `name`
- `sport`
- `country`

Example:
NBA
- `sport` = basketball
- `country` = USA

---

## Team Data Structure

Fields:
- `team_id`
- `league_id`
- `team_name`
- `home_city`

Each team must belong to one league.

---

## Player Data Structure

Fields:
- `player_id`
- `team_id`
- `player_name`
- `position`

Players must be linked to a team.

---

## Match Data Structure

Fields:
- `match_id`
- `league_id`
- `home_team_id`
- `away_team_id`
- `match_date`
- `status`

Status values:
- `scheduled`
- `live`
- `finished`

---

## Match Statistics Structure

Core statistics must be standardized across sports.

Example fields:
- `home_score`
- `away_score`

Additional statistics stored in:
`raw_stats` JSON.

Example:
- `rebounds`
- `shots_on_goal`
- `pitch_count`

---

## Player Role Normalization

Each sport has different positions.
Mosport must normalize them into core roles.

**Basketball**
- `guard`
- `forward`
- `center`

**Football**
- `goalkeeper`
- `defender`
- `midfielder`
- `forward`

**Baseball**
- `pitcher`
- `batter`
- `two_way`

If a baseball player is both pitcher and batter, assign role: `two_way`.
In player detail pages show both statistics.

---

## Match Context Variables

These variables are required for simulation.

- `home_team`
- `away_team`
- `home_advantage`
- `rest_days`
- `recent_form`

These variables feed into the World State Engine.

---

## Time Window Rules

For modeling:
- Recent form uses the last 10 matches.
- Momentum is calculated from recent match outcomes.
- Fatigue is calculated from match density.

---

## Odds Data Structure

Mosport does not store bookmaker brands.

Fields:
- `match_id`
- `market_home_probability`
- `market_away_probability`
- `source`

Source must be labeled as: `Global Market Average`.

---

## Anti-Corruption Layer

All incoming data must pass validation.

Pipeline:
External API
↓
Schema Validation
↓
Normalization
↓
Database Insert

If validation fails, store the data in `dead_letter_queue`.

---

## Data Update Frequency

- Match schedules: update every 10 minutes.
- Match statistics: update every 30 minutes.
- Odds data: update every 60 minutes.

---

## Data Quality Rules

All match records must contain:
- `home_team_id`
- `away_team_id`
- `match_date`

Matches missing these fields must be rejected.

---

## Historical Data Policy

Mosport must retain historical match data.
Historical matches are used for:
- team strength modeling
- momentum analysis
- fatigue estimation

Historical data must never be deleted.

---

## Derived Data Layers

Raw data feeds three derived layers.

**World State Layer**
- `team_strength`
- `momentum`
- `fatigue`

**Quant Layer**
- `expected_score`
- `variance`

**Signal Layer**
- `model_probability`
- `market_probability`
- `snr`

---

## Data Storage Priority

Priority 1: match results
Priority 2: team statistics
Priority 3: player statistics

This ensures the system continues working even if player data is incomplete.

---

## Final Principle

Data consistency is more important than data volume.
If a data source introduces inconsistent or unreliable data, it must be rejected.
Mosport prioritizes clean structured data over large noisy datasets.
