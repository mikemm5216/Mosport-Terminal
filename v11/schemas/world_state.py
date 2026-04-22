from pydantic import BaseModel
from typing import List


class WorldState(BaseModel):
    game_id: str
    sport: str
    home_team: str
    away_team: str

    pressure: float
    fatigue: float
    volatility: float
    momentum: float
    mismatch: float

    market_home_prob: float
    tags: List[str] = []
