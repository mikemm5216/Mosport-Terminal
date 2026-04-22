from pydantic import BaseModel
from typing import List, Dict, Any


class FinalDecision(BaseModel):
    game_id: str
    final_probability_home: float
    market_home_prob: float
    decision_score: float
    label: str
    action: str
    edge_vs_market: float
    dominant_agent: str
    explanation: str
    opinions: List[Dict[str, Any]]
