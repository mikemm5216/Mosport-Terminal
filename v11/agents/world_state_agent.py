from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.world_state import WorldState


class WorldStateAgent(BaseAgent):
    """Pure transformation agent: raw game data → structured WorldState.
    No prediction. No side effects. Deterministic mapping only.

    V12: also passes through player_states, team_states, matchup_context
    and derives aggregate V12 signals (roster_risk, team_collapse_risk,
    player_leverage, data_confidence) when that context is present.
    """

    name = "WorldStateAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        signals = input_data.get("signals", {})

        # ── V12 aggregate derivation (safe defaults when absent) ──────────────
        team_states = input_data.get("team_states") or {}
        home_ts = team_states.get("home") or {}
        away_ts = team_states.get("away") or {}

        # roster_risk: mean of home + away collapse probability
        home_cp = home_ts.get("collapse_probability", 0.35)
        away_cp = away_ts.get("collapse_probability", 0.35)
        roster_risk = signals.get("roster_risk", round((home_cp + away_cp) / 2, 4))

        team_collapse_risk = signals.get("team_collapse_risk", max(home_cp, away_cp))

        # player_leverage: mean of star_dependency across both teams
        home_sd = home_ts.get("star_dependency", 0.5)
        away_sd = away_ts.get("star_dependency", 0.5)
        player_leverage = signals.get("player_leverage", round((home_sd + away_sd) / 2, 4))

        # data_confidence: average of both team data_confidence, fallback 0.3
        home_dc = home_ts.get("data_confidence", 0.3)
        away_dc = away_ts.get("data_confidence", 0.3)
        data_confidence = round((home_dc + away_dc) / 2, 4)

        world_state = WorldState(
            # V11 identity
            game_id=input_data["game_id"],
            sport=input_data["sport"],
            home_team=input_data["home_team"],
            away_team=input_data["away_team"],
            # V11 signals
            pressure=signals.get("pressure", 0.0),
            fatigue=signals.get("fatigue", 0.0),
            volatility=signals.get("volatility", 0.0),
            momentum=signals.get("momentum", 0.0),
            mismatch=signals.get("mismatch", 0.0),
            market_home_prob=input_data.get("market_home_prob", 0.5),
            tags=input_data.get("tags", []),
            # V12 signals
            roster_risk=roster_risk,
            team_collapse_risk=team_collapse_risk,
            player_leverage=player_leverage,
            data_confidence=data_confidence,
            # V12 structured context (pass-through as-is)
            player_states=input_data.get("player_states"),
            team_states=input_data.get("team_states"),
            matchup_context=input_data.get("matchup_context"),
        )

        return world_state.model_dump()
