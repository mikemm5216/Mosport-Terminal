"""
Performance Engine
Output: win_probability, expected_score_range
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np


@dataclass
class PerformanceOutput:
    home_win_probability: float
    away_win_probability: float
    expected_score_home: float
    expected_score_away: float
    score_range: str  # e.g. "4-2 to 7-4"


def compute_performance(
    feature_vector: list[float],
    booster=None,
) -> PerformanceOutput:
    """
    If a trained XGBoost booster is provided, use it.
    Otherwise fall back to a calibrated rule-based computation for demo.
    """
    if booster is not None:
        import xgboost as xgb
        X = np.array([feature_vector])
        dmatrix = xgb.DMatrix(X)
        home_win_prob = float(booster.predict(dmatrix)[0])
    else:
        home_win_prob = _rule_based_win_prob(feature_vector)

    home_win_prob = max(0.05, min(0.95, home_win_prob))
    away_win_prob = 1.0 - home_win_prob

    home_runs, away_runs = _estimate_score(feature_vector, home_win_prob)

    lo_h = max(0, int(home_runs - 1.5))
    hi_h = int(home_runs + 1.5)
    lo_a = max(0, int(away_runs - 1.5))
    hi_a = int(away_runs + 1.5)

    return PerformanceOutput(
        home_win_probability=round(home_win_prob, 4),
        away_win_probability=round(away_win_prob, 4),
        expected_score_home=round(home_runs, 2),
        expected_score_away=round(away_runs, 2),
        score_range=f"{lo_h}-{lo_a} to {hi_h}-{hi_a}",
    )


def _rule_based_win_prob(fv: list[float]) -> float:
    """
    Weights calibrated to MLB historical home-win base rate (~54%).
    Indices match MLBFeatureVector.to_list() order.
    """
    # fv indices: [home_fatigue, away_fatigue, home_travel, away_travel,
    #              home_whoop, away_whoop, win_delta, home_streak, away_streak,
    #              era_diff, pressure, sentiment_diff, rivalry]
    base = 0.54

    fatigue_delta = fv[1] - fv[0]        # away fatigued more → home benefit
    travel_delta  = fv[3] - fv[2]        # away traveled more → home benefit
    win_delta     = fv[6]                 # home win rate - away win rate
    streak_delta  = fv[7] - fv[8]        # home momentum - away momentum
    era_advantage = fv[9] / 6.0          # pitcher edge, normalized
    sentiment     = fv[11] * 0.05

    score = (
        base
        + fatigue_delta * 0.08
        + travel_delta  * 0.06
        + win_delta     * 0.25
        + streak_delta  * 0.10
        + era_advantage * 0.12
        + sentiment
    )
    return float(score)


def _estimate_score(fv: list[float], home_win_prob: float) -> tuple[float, float]:
    """MLB average: ~4.5 runs per team per game."""
    base_runs = 4.5
    era_diff = fv[9] if len(fv) > 9 else 0.0

    home_runs = base_runs + home_win_prob * 1.5 + era_diff * 0.3
    away_runs = base_runs + (1 - home_win_prob) * 1.5 - era_diff * 0.3
    return max(0.0, home_runs), max(0.0, away_runs)
