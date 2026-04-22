from typing import Dict, Any, List

from v11.agents.base import BaseAgent
from v11.schemas.decision import FinalDecision


class ArbiterAgent(BaseAgent):
    """The sole decision-maker for Mosport V11.1 VP-ready.
    Resolves opinions based on dominance, upset inversions, and market edges.
    """

    name = "ArbiterAgent"

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        world_state = input_data["world_state"]
        opinions: List[Dict[str, Any]] = input_data["opinions"]

        mismatch = world_state["mismatch"]
        volatility = world_state["volatility"]
        market_home_prob = world_state["market_home_prob"]

        # --- 3.1 Convert to score & Extract Leans ---
        scores = {}
        sharp_lean = "NO_EDGE"
        analyst_lean = "NO_EDGE"
        
        for opinion in opinions:
            agent_name = opinion["agent"]
            lean = opinion["lean"]
            confidence = opinion["confidence"]

            if lean == "HOME":
                scores[agent_name] = confidence
            elif lean == "AWAY":
                scores[agent_name] = -confidence
            else:
                scores[agent_name] = 0.0
                
            if agent_name == "SharpAgent":
                sharp_lean = lean
            elif agent_name == "AnalystAgent":
                analyst_lean = lean

        sharp_score = scores.get("SharpAgent", 0.0)
        analyst_score = scores.get("AnalystAgent", 0.0)

        sport = world_state.get("sport", "baseball").lower()

        # --- 3.2 DOMINANCE LOGIC ---
        if sport == "basketball":
            if mismatch >= 0.70 and volatility < 0.60:
                dominant = "SHARP"
            elif volatility <= 0.50 and market_home_prob >= 0.55:
                dominant = "ANALYST"
            else:
                dominant = "HYBRID"
                
            upset_trigger = (
                sharp_lean == "AWAY" and
                analyst_lean == "HOME" and
                market_home_prob >= 0.55 and
                mismatch >= 0.70
            )
            chaos_threshold = 0.75
            shift = min(0.10, 0.03 + (mismatch - 0.70) * 0.35) if upset_trigger else 0
            
        elif sport in ["soccer", "football"]:
            if mismatch >= 0.60 and volatility < 0.65:
                dominant = "SHARP"
            elif volatility <= 0.55 and market_home_prob >= 0.52:
                dominant = "ANALYST"
            else:
                dominant = "HYBRID"
                
            upset_trigger = (
                sharp_lean == "AWAY" and
                analyst_lean == "HOME" and
                market_home_prob >= 0.52 and
                mismatch >= 0.60
            )
            chaos_threshold = 0.65
            shift = min(0.10, 0.03 + (mismatch - 0.60) * 0.35) if upset_trigger else 0
            
        else: # baseball
            if mismatch >= 0.65 and volatility < 0.70:
                dominant = "SHARP"
            elif volatility <= 0.50 and market_home_prob >= 0.53:
                dominant = "ANALYST"
            else:
                dominant = "HYBRID"
                
            upset_trigger = (
                sharp_lean == "AWAY" and
                analyst_lean == "HOME" and
                market_home_prob >= 0.54 and
                mismatch >= 0.65
            )
            chaos_threshold = 0.70
            shift = min(0.10, 0.03 + (mismatch - 0.65) * 0.35) if upset_trigger else 0

        # --- 3.3 Weighted resolution ---
        if dominant == "SHARP":
            w_sharp = 0.75
            w_analyst = 0.25
        elif dominant == "ANALYST":
            w_sharp = 0.25
            w_analyst = 0.75
        else:
            w_sharp = 0.45
            w_analyst = 0.55

        blended = sharp_score * w_sharp + analyst_score * w_analyst

        # --- 3.4 Base probability ---
        base_prob = 0.5 + blended * 0.15

        # --- 4 TRUE UPSET (NOT LABEL ONLY) ---
        if upset_trigger:
            final_prob = base_prob - shift
        else:
            final_prob = base_prob

        # Clip final probability
        final_prob = max(0.20, min(0.80, final_prob))
        final_prob = round(final_prob, 4)

        # --- 5 DECISION SCORE = MARKET EDGE ---
        edge_vs_market = round(final_prob - market_home_prob, 4)
        decision_score = round(abs(edge_vs_market), 4)

        # --- 6 LABEL ---
        if volatility >= chaos_threshold:
            label = "CHAOS"
        elif upset_trigger:
            label = "UPSET"
        elif decision_score >= 0.06:
            label = "STRONG"
        else:
            label = "WEAK"

        # --- 7 ACTION OUTPUT ---
        if label == "CHAOS":
            action = "AVOID_HIGH_VOLATILITY"
        elif label == "UPSET":
            action = "WATCH_UPSET"
        elif final_prob >= 0.55:
            action = "LEAN_HOME"
        elif final_prob <= 0.45:
            action = "LEAN_AWAY"
        else:
            action = "NO_ACTION"

        # --- Build explanation ---
        explanation = (
            f"Dominant={dominant}, Blended={blended:+.4f}. "
            f"Upset Triggered={upset_trigger}. Final={final_prob:.4f} vs Market={market_home_prob}. "
            f"Edge={edge_vs_market:+.4f}. Action: {action}."
        )

        decision = FinalDecision(
            game_id=world_state["game_id"],
            final_probability_home=final_prob,
            market_home_prob=market_home_prob,
            decision_score=decision_score,
            label=label,
            action=action,
            edge_vs_market=edge_vs_market,
            dominant_agent=dominant,
            explanation=explanation,
            opinions=opinions,
        )

        return decision.model_dump()
