from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.opinion import AgentOpinion


class AnalystAgent(BaseAgent):
    """Conservative analyst agent.
    Trusts market baseline. Avoids volatility.
    Only takes a position when market signal is clear and volatility is low.

    V12: also considers team collapse probability and data_confidence.
    Low data confidence dampens conviction; high collapse pressure on away
    team can flip a marginal NO_EDGE to AWAY.
    """

    name = "AnalystAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        market_home_prob = input_data["market_home_prob"]
        volatility = input_data["volatility"]
        sport = input_data.get("sport", "baseball").lower()

        # V12 optional fields (gracefully absent in V11 payloads)
        data_confidence = input_data.get("data_confidence", 1.0)
        team_states = input_data.get("team_states") or {}
        home_ts = team_states.get("home") or {}
        away_ts = team_states.get("away") or {}
        away_collapse = away_ts.get("collapse_probability", 0.35)
        home_collapse = home_ts.get("collapse_probability", 0.35)

        # Sport-specific thresholds (V11 unchanged)
        if sport == "basketball":
            home_thresh = 0.55
            away_thresh = 0.45
            vol_thresh = 0.50
        elif sport in ["soccer", "football"]:
            home_thresh = 0.52
            away_thresh = 0.48
            vol_thresh = 0.55
        else:  # baseball
            home_thresh = 0.53
            away_thresh = 0.47
            vol_thresh = 0.60

        # V12 effective volatility: inflate when low data_confidence
        effective_volatility = volatility
        if data_confidence < 0.5:
            effective_volatility = min(1.0, volatility + (0.5 - data_confidence) * 0.3)

        if market_home_prob >= home_thresh and effective_volatility < vol_thresh:
            lean = "HOME"
            confidence = 0.68
            reasoning = (
                f"[{sport.upper()}] Market favors HOME at {market_home_prob:.2f} "
                f"with manageable volatility {effective_volatility:.2f}. "
                f"Taking strong HOME position."
            )
            # V12: if away team has high collapse risk, boost confidence slightly
            if away_collapse >= 0.55:
                confidence = min(0.85, confidence + 0.08)
                reasoning += f" Away collapse risk {away_collapse:.2f} supports HOME read."
        elif market_home_prob <= away_thresh and effective_volatility < vol_thresh:
            lean = "AWAY"
            confidence = 0.66
            reasoning = (
                f"[{sport.upper()}] Market favors AWAY (home prob {market_home_prob:.2f}) "
                f"with low volatility {effective_volatility:.2f}. "
                f"Taking strong AWAY position."
            )
            if home_collapse >= 0.55:
                confidence = min(0.82, confidence + 0.07)
                reasoning += f" Home collapse risk {home_collapse:.2f} supports AWAY read."
        else:
            lean = "NO_EDGE"
            confidence = 0.40
            reasoning = (
                f"[{sport.upper()}] No clear edge detected. "
                f"Market home prob {market_home_prob:.2f}, "
                f"volatility {effective_volatility:.2f}. Deliberately holding back."
            )

        # V12: if data confidence is low, cap conviction and flag it
        if data_confidence < 0.4 and lean != "NO_EDGE":
            confidence = min(confidence, 0.52)
            reasoning += (
                f" [V12] Data confidence low ({data_confidence:.2f}) — "
                f"player-state signal is capped. Roster data may be placeholder-driven."
            )

        features_used = ["market_home_prob", "volatility", "sport"]
        if input_data.get("data_confidence") is not None:
            features_used += ["data_confidence", "team_collapse_probability"]

        opinion = AgentOpinion(
            agent=self.name,
            lean=lean,
            confidence=round(confidence, 4),
            reasoning=reasoning,
            features_used=features_used,
        )

        return opinion.model_dump()
