from pydantic import BaseModel
from typing import List, Literal


class AgentOpinion(BaseModel):
    agent: str
    lean: Literal["HOME", "AWAY", "NO_EDGE"]
    confidence: float
    reasoning: str
    features_used: List[str]
