from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


# ── V11 core (unchanged) ──────────────────────────────────────────────────────

class WorldState(BaseModel):
    """V11 + V12 World State. All V12 fields are optional with safe defaults
    so existing V11 payloads continue to work without modification."""

    # V11 identity
    game_id: str
    sport: str
    home_team: str
    away_team: str

    # V11 signals
    pressure: float
    fatigue: float
    volatility: float
    momentum: float
    mismatch: float

    market_home_prob: float
    tags: List[str] = Field(default_factory=list)

    # ── V12 additive signals ──────────────────────────────────────────────────
    roster_risk: float = 0.0           # aggregate roster fragility [0,1]
    team_collapse_risk: float = 0.0    # collapse probability across both teams
    player_leverage: float = 0.5       # key-player impact on outcome [0,1]

    # ── V12 structured context (pass-through from frontend) ──────────────────
    player_states: Optional[Dict[str, Any]] = None   # {home: [...], away: [...]}
    team_states: Optional[Dict[str, Any]] = None     # {home: {...}, away: {...}}
    matchup_context: Optional[Dict[str, Any]] = None # {player_edges, unit_edges, zone_edges}

    # ── V12 data quality flag ─────────────────────────────────────────────────
    data_confidence: float = 0.5       # overall data quality [0,1]; low → agents stay conservative
