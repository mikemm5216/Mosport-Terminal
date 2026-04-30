from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.opinion import AgentOpinion


class SharpAgent(BaseAgent):
    """Aggressive sharp agent.
    Hunts mismatch signals. Opposes market when edge is detected.
    High mismatch → fade the market (AWAY). Low mismatch → side with home.

    V12: also reads roster_risk, team_collapse_risk, player_leverage.
    Aggregate roster_risk caps conviction but is not directional unless side-specific risk is provided.
    High player_leverage amplifies mismatch signal.
    """

    name = "SharpAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        mismatch = input_data["mismatch"]
        sport = input_data.get("sport", "baseball").lower()

        # V12 optional signals (zero / neutral defaults for V11 payloads)
        roster_risk = input_data.get("roster_risk", 0.0)
        team_collapse_risk = input_data.get("team_collapse_risk", 0.0)
        player_leverage = input_data.get("player_leverage", 0.5)
        data_confidence = input_data.get("data_confidence", 1.0)

        # V12: amplify effective mismatch when key players have high leverage
        # player_leverage of 0.5 is neutral; above/below shifts edge
        leverage_amplifier = 1.0 + (player_leverage - 0.5) * 0.4
        effective_mismatch = min(1.0, mismatch * leverage_amplifier)

        # Sport-specific thresholds
        if sport == "basketball":
            thresh_high = 0.70
            thresh_low = 0.30
        elif sport in ["soccer", "football"]:
            thresh_high = 0.60
            thresh_low = 0.40
        else:
            thresh_high = 0.65
            thresh_low = 0.35

        if effective_mismatch >= thresh_high:
            lean = "AWAY"
            confidence = 0.75
            reasoning = (
                f"[{sport.upper()}] High mismatch detected at {mismatch:.2f} "
                f"(effective {effective_mismatch:.2f} with leverage {player_leverage:.2f}). "
                f"Fading market — taking strong AWAY position."
            )
        elif effective_mismatch <= thresh_low:
            lean = "HOME"
            confidence = 0.70
            reasoning = (
                f"[{sport.upper()}] Low mismatch at {mismatch:.2f} suggests HOME dominance. "
                f"Taking aggressive HOME position."
            )
        else:
            lean = "NO_EDGE"
            confidence = 0.45
            reasoning = (
                f"[{sport.upper()}] Mismatch at {mismatch:.2f} "
                f"(effective {effective_mismatch:.2f}) is within neutral zone. "
                f"Observing with high caution."
            )

        # V12: roster_risk is aggregate, so it caps conviction instead of forcing AWAY lean
        if roster_risk >= 0.55:
            confidence = min(confidence, 0.60)
            reasoning += (
                f" [V12] Elevated aggregate roster risk ({roster_risk:.2f}). "
                f"Conviction capped; not treated as directional roster edge."
            )

        # V12: team collapse risk adds pressure signal
        if team_collapse_risk >= 0.60:
            confidence = min(0.80, confidence + 0.05)
            reasoning += f" High team collapse risk ({team_collapse_risk:.2f}) sharpens the read."

        # V12: cap if data is mostly placeholder
        if data_confidence < 0.4:
            confidence = min(confidence, 0.55)
            reasoning += (
                f" [V12] Low data confidence ({data_confidence:.2f}). "
                f"Operating on simulated roster state. Player-state signal is capped."
            )

        features_used = ["mismatch", "sport"]
        if input_data.get("roster_risk") is not None:
            features_used += ["roster_risk", "team_collapse_risk", "player_leverage", "data_confidence"]

        opinion = AgentOpinion(
            agent=self.name,
            lean=lean,
            confidence=round(confidence, 4),
            reasoning=reasoning,
            features_used=features_used,
        )

        return opinion.model_dump()
