from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.world_state import WorldState


class WorldStateAgent(BaseAgent):
    """Pure transformation agent: raw game data → structured WorldState.
    No prediction. No side effects. Deterministic mapping only."""

    name = "WorldStateAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        signals = input_data.get("signals", {})

        world_state = WorldState(
            game_id=input_data["game_id"],
            sport=input_data["sport"],
            home_team=input_data["home_team"],
            away_team=input_data["away_team"],
            pressure=signals.get("pressure", 0.0),
            fatigue=signals.get("fatigue", 0.0),
            volatility=signals.get("volatility", 0.0),
            momentum=signals.get("momentum", 0.0),
            mismatch=signals.get("mismatch", 0.0),
            market_home_prob=input_data.get("market_home_prob", 0.5),
            tags=input_data.get("tags", []),
        )

        return world_state.model_dump()
