from typing import Dict, Any

from v11.agents.base import BaseAgent
from v11.schemas.opinion import AgentOpinion


class AnalystAgent(BaseAgent):
    """Conservative analyst agent.
    Trusts market baseline. Avoids volatility.
    Only takes a position when market signal is clear and volatility is low."""

    name = "AnalystAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        market_home_prob = input_data["market_home_prob"]
        volatility = input_data["volatility"]

        if market_home_prob >= 0.53 and volatility < 0.60:
            lean = "HOME"
            confidence = 0.68
            reasoning = (
                f"Market favors HOME at {market_home_prob:.2f} "
                f"with manageable volatility {volatility:.2f}. "
                f"Taking strong HOME position."
            )
        elif market_home_prob <= 0.47 and volatility < 0.60:
            lean = "AWAY"
            confidence = 0.66
            reasoning = (
                f"Market favors AWAY (home prob {market_home_prob:.2f}) "
                f"with low volatility {volatility:.2f}. "
                f"Taking strong AWAY position."
            )
        else:
            lean = "NO_EDGE"
            confidence = 0.40
            reasoning = (
                f"No clear edge detected. "
                f"Market home prob {market_home_prob:.2f}, "
                f"volatility {volatility:.2f}. Deliberately holding back."
            )

        opinion = AgentOpinion(
            agent=self.name,
            lean=lean,
            confidence=round(confidence, 4),
            reasoning=reasoning,
            features_used=["market_home_prob", "volatility"],
        )

        return opinion.model_dump()
