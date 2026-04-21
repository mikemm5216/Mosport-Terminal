"""
MLB Feature Pipeline — STEP 2
Transforms raw MLB game context into numeric signal vectors.

World Outcome = Physiological Signal + Psychological Signal
"""

from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class PhysiologicalInput:
    player_id: str = ""
    games_last_7_days: int = 0
    rest_days: int = 1
    travel_km: float = 0.0
    age: int = 27
    # WHOOP integration hooks (optional, zero-padded if absent)
    whoop_hrv: float = 0.0
    whoop_strain: float = 0.0
    whoop_recovery: float = 0.0


@dataclass
class PsychologicalInput:
    home_win_rate: float = 0.5
    away_win_rate: float = 0.5
    home_streak: int = 0       # positive = win streak, negative = loss streak
    away_streak: int = 0
    home_era: float = 4.0      # starting pitcher ERA
    away_era: float = 4.0
    sentiment_home: float = 0.0  # -1 to 1
    sentiment_away: float = 0.0
    standings_gap: float = 0.0   # games behind / ahead in division
    rivalry_factor: float = 1.0  # 1.0 = normal, >1.0 = rivalry game


@dataclass
class MLBGameContext:
    match_id: str
    home_team: str
    away_team: str
    home_phys: PhysiologicalInput = field(default_factory=PhysiologicalInput)
    away_phys: PhysiologicalInput = field(default_factory=PhysiologicalInput)
    psych: PsychologicalInput = field(default_factory=PsychologicalInput)


@dataclass
class MLBFeatureVector:
    # Physiological signals
    home_fatigue_index: float = 0.0
    away_fatigue_index: float = 0.0
    home_travel_score: float = 0.0
    away_travel_score: float = 0.0
    home_whoop_recovery: float = 0.0
    away_whoop_recovery: float = 0.0

    # Psychological / contextual signals
    home_away_win_delta: float = 0.0
    home_streak_momentum: float = 0.0
    away_streak_momentum: float = 0.0
    pitcher_era_differential: float = 0.0
    pressure_index: float = 0.0
    sentiment_differential: float = 0.0
    rivalry_multiplier: float = 1.0

    def to_list(self) -> list[float]:
        return [
            self.home_fatigue_index,
            self.away_fatigue_index,
            self.home_travel_score,
            self.away_travel_score,
            self.home_whoop_recovery,
            self.away_whoop_recovery,
            self.home_away_win_delta,
            self.home_streak_momentum,
            self.away_streak_momentum,
            self.pitcher_era_differential,
            self.pressure_index,
            self.sentiment_differential,
            self.rivalry_multiplier,
        ]


def _fatigue_index(games_last_7: int, rest_days: int) -> float:
    """Higher = more fatigued. Normalized 0–1."""
    base = games_last_7 / 7.0
    rest_penalty = max(0.0, 1.0 - rest_days / 3.0)
    return min(1.0, base * 0.6 + rest_penalty * 0.4)


def _travel_score(km: float) -> float:
    """Higher = more travel stress. Normalized 0–1."""
    return min(1.0, km / 5000.0)


def _streak_momentum(streak: int) -> float:
    """Sigmoid-scaled momentum. -1 to 1."""
    return math.tanh(streak / 5.0)


def _pitcher_era_diff(home_era: float, away_era: float) -> float:
    """Positive = home pitcher advantage, clamped."""
    diff = away_era - home_era
    return max(-3.0, min(3.0, diff))


def _pressure_index(standings_gap: float) -> float:
    """Higher magnitude = more pressure. Clamped -1 to 1."""
    return max(-1.0, min(1.0, standings_gap / 10.0))


def build_feature_vector(ctx: MLBGameContext) -> MLBFeatureVector:
    fv = MLBFeatureVector(
        home_fatigue_index=_fatigue_index(ctx.home_phys.games_last_7_days, ctx.home_phys.rest_days),
        away_fatigue_index=_fatigue_index(ctx.away_phys.games_last_7_days, ctx.away_phys.rest_days),
        home_travel_score=_travel_score(ctx.home_phys.travel_km),
        away_travel_score=_travel_score(ctx.away_phys.travel_km),
        home_whoop_recovery=ctx.home_phys.whoop_recovery / 100.0,
        away_whoop_recovery=ctx.away_phys.whoop_recovery / 100.0,
        home_away_win_delta=ctx.psych.home_win_rate - ctx.psych.away_win_rate,
        home_streak_momentum=_streak_momentum(ctx.psych.home_streak),
        away_streak_momentum=_streak_momentum(ctx.psych.away_streak),
        pitcher_era_differential=_pitcher_era_diff(ctx.psych.home_era, ctx.psych.away_era),
        pressure_index=_pressure_index(ctx.psych.standings_gap),
        sentiment_differential=ctx.psych.sentiment_home - ctx.psych.sentiment_away,
        rivalry_multiplier=ctx.psych.rivalry_factor,
    )
    return fv
