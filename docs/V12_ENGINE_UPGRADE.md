# V12 Engine Upgrade

This document outlines the architecture and changes introduced in the V12 Mosport Engine Upgrade. The upgrade establishes a clear boundary between player-level simulations, team-level aggregations, and world-state generation, while ensuring strict backward compatibility with the existing V11 backend.

## Architecture Summary

The V12 architecture formalizes the pipeline from raw player data to agent decisions:

`Player Bio/Psycho Engine` → `Player State` → `Team State Aggregator` → `World Engine` → `Agent Debate` → `Arbiter Decision`

### Key Boundaries

1.  **Player Readiness (`frontend/app/lib/playerReadiness.ts`)**: Responsible strictly for roster identity, freshness, and generating deterministic placeholder data. It formats data into `V12PlayerState`.
2.  **Key Player Engine (`frontend/app/lib/engines/keyPlayerEngine.ts`)**: Responsible for ranking players by impact.
3.  **Team State Engine (`frontend/app/lib/engines/teamStateEngine.ts`)**: Responsible for aggregating individual `V12PlayerState` arrays into `V12TeamState`. It computes metrics like `physical_load`, `rotation_risk`, and critically, `data_confidence`.
4.  **World Engine (`frontend/app/lib/v11.ts`)**: Assembles the final payload. It takes V11 signals and appends V12 context (`player_states`, `team_states`, `matchup_context`, and derived aggregate signals) without breaking the expected schema.

## PlayerState → TeamState → WorldState Flow

1.  **Frontend Generation**: For a given match, `generateSimulatedPlayers` creates simulated player records.
2.  **Team Aggregation**: `buildTeamStateV12` aggregates these players. If players are mostly placeholders (lacking real biometric data), `data_confidence` drops proportionally.
3.  **Payload Assembly**: `matchToV11Input` bundles this into the `/organism/run` payload.
4.  **Backend Ingestion**: The `WorldStateAgent` maps the payload to the strict `WorldState` Pydantic schema, plucking out V12 signals safely.
5.  **Agent Consumption**:
    *   **AnalystAgent**: Considers `team.collapse_probability` and caps its conviction if `data_confidence` is low.
    *   **SharpAgent**: Considers `roster_risk`, `team_collapse_risk`, and `player_leverage`. Amplifies or dampens edges based on these factors, and also caps conviction on low data confidence.

## Agent Fields Consumed

*   **AnalystAgent**: `market_home_prob`, `volatility`, `sport`, `data_confidence`, `team_collapse_probability`
*   **SharpAgent**: `mismatch`, `sport`, `roster_risk`, `team_collapse_risk`, `player_leverage`, `data_confidence`
*   **ArbiterAgent**: `mismatch`, `volatility`, `market_home_prob`, `sport` (unchanged from V11)

## Known Limitations

*   **Placeholder Dominance**: Currently, the system relies on deterministic simulated data for player states. Agents are instructed to be "honest" about this and use conservative language (e.g., "simulated roster state") when `data_confidence` is low.
*   **Matchup Context**: The `matchup_context` object is currently empty by default and awaits a dedicated model to populate `player_edges` and `unit_edges`.

## TODOs

*   [ ] **Real Roster Provider**: Integrate a live provider for accurate daily rosters to reduce placeholder counts.
*   [ ] **Real Biometric Provider**: Integrate Whoop or a similar API to replace deterministic HRV/Sleep simulations with real physiological telemetry.
*   [ ] **True Matchup Model**: Develop an engine to populate `matchup_context` for nuanced unit vs. unit analysis.
