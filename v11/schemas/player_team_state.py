"""V12 Player / Team schemas.

These are purely additive and used as strongly-typed helpers
for agents that choose to read V12 context.  V11 agents that
don't reference these classes are unaffected.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


# ── Player Physical State ─────────────────────────────────────────────────────

class PlayerPhysicalState(BaseModel):
    recovery: float = 0.72       # 0–1; higher = more recovered
    fatigue: float = 0.28        # 0–1
    sleep_debt: float = 0.8      # hours of sleep debt
    hrv_delta: float = 0.0       # HRV change vs baseline (signed)
    collapse_risk: float = 0.25  # 0–1


# ── Player Psychological State ────────────────────────────────────────────────

class PlayerPsychologicalState(BaseModel):
    confidence: float = 0.5
    pressure_response: float = 0.5   # how well player handles pressure [0,1]
    volatility: float = 0.4
    clutch_stability: float = 0.5
    tilt_risk: float = 0.25


# ── Player Readiness (derived) ────────────────────────────────────────────────

class PlayerReadinessState(BaseModel):
    flag: Literal["CLEAR", "MONITOR", "REST"] = "CLEAR"
    minutes_risk: float = 0.2        # probability of reduced minutes
    collapse_risk: float = 0.25


# ── Full Player State V12 ─────────────────────────────────────────────────────

class PlayerStateV12(BaseModel):
    name: str
    team: str
    side: Literal["home", "away"]
    role: str = "KEY PLAYER"
    source: str = "simulated_player_state"
    placeholder: bool = True
    importance_score: float = 0.5

    physical: PlayerPhysicalState = Field(default_factory=PlayerPhysicalState)
    psychological: PlayerPsychologicalState = Field(default_factory=PlayerPsychologicalState)
    readiness: PlayerReadinessState = Field(default_factory=PlayerReadinessState)


# ── Team State V12 ────────────────────────────────────────────────────────────

class TeamStateV12(BaseModel):
    team: str
    side: Literal["home", "away"]

    physical_load: float = 0.4           # 0=fresh, 1=exhausted
    mental_pressure: float = 0.5
    rotation_risk: float = 0.3           # risk from rotation depth issues
    star_dependency: float = 0.5         # how reliant team is on one player
    bench_fragility: float = 0.4
    collapse_probability: float = 0.35

    key_player_count: int = 0
    placeholder_count: int = 0
    data_confidence: float = 0.3         # 0=all placeholder, 1=full real data
