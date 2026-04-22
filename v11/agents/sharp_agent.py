from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.opinion import AgentOpinion


class SharpAgent(BaseAgent):
    """Aggressive sharp agent.
    Hunts mismatch signals. Opposes market when edge is detected.
    High mismatch → fade the market (AWAY). Low mismatch → side with home."""

    name = "SharpAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        mismatch = input_data["mismatch"]

        if mismatch >= 0.65:
            lean = "AWAY"
            confidence = 0.75
            reasoning = (
                f"High mismatch detected at {mismatch:.2f}. "
                f"Fading market — taking strong AWAY position."
            )
        elif mismatch <= 0.35:
            lean = "HOME"
            confidence = 0.70
            reasoning = (
                f"Low mismatch at {mismatch:.2f} suggests HOME dominance. "
                f"Taking aggressive HOME position."
            )
        else:
            lean = "NO_EDGE"
            confidence = 0.45
            reasoning = (
                f"Mismatch at {mismatch:.2f} is within neutral zone. "
                f"Observing with high caution."
            )

        opinion = AgentOpinion(
            agent=self.name,
            lean=lean,
            confidence=round(confidence, 4),
            reasoning=reasoning,
            features_used=["mismatch"],
        )

        return opinion.model_dump()
