"""
Risk Engine
Output: upset_probability, volatility_index, confidence_calibration_score
"""

from dataclasses import dataclass
import math


@dataclass
class RiskOutput:
    upset_probability: float        # probability the underdog wins
    volatility_index: float         # 0–1, high = unpredictable game
    confidence_calibration: float   # 0–1, model confidence in its own prediction


def compute_risk(
    home_win_prob: float,
    feature_vector: list[float],
    calibration_error: float = 0.0,  # historical ECE if available
) -> RiskOutput:
    upset_prob = _upset_probability(home_win_prob)
    volatility = _volatility_index(feature_vector, home_win_prob)
    confidence = _confidence_calibration(home_win_prob, volatility, calibration_error)

    return RiskOutput(
        upset_probability=round(upset_prob, 4),
        volatility_index=round(volatility, 4),
        confidence_calibration=round(confidence, 4),
    )


def _upset_probability(home_win_prob: float) -> float:
    """
    Underdog = team with lower win probability.
    Upset probability is non-linear — upsets are more likely near 50%.
    """
    favorite_prob = max(home_win_prob, 1.0 - home_win_prob)
    # As favorite_prob → 1.0, upset becomes very unlikely
    # As favorite_prob → 0.5, upset is almost as likely as expected outcome
    return round(1.0 - favorite_prob, 4)


def _volatility_index(fv: list[float], home_win_prob: float) -> float:
    """
    High volatility = game is close AND external signals are noisy.
    """
    closeness = 1.0 - abs(home_win_prob - 0.5) * 2.0  # 1.0 when 50/50

    # Extract signal variance components
    era_diff_magnitude = abs(fv[9]) / 3.0 if len(fv) > 9 else 0.0
    sentiment_magnitude = abs(fv[11]) if len(fv) > 11 else 0.0
    streak_tension = min(1.0, (abs(fv[7]) + abs(fv[8])) / 2.0) if len(fv) > 8 else 0.0

    noise = (era_diff_magnitude * 0.3 + sentiment_magnitude * 0.2 + streak_tension * 0.2)
    volatility = closeness * 0.5 + noise * 0.5

    return min(1.0, volatility)


def _confidence_calibration(
    home_win_prob: float,
    volatility: float,
    calibration_error: float,
) -> float:
    """
    Confidence = how much to trust this prediction.
    Penalized by high volatility and known calibration error.
    """
    distance_from_coin_flip = abs(home_win_prob - 0.5) * 2.0  # 0–1
    base_confidence = 0.5 + distance_from_coin_flip * 0.4
    volatility_penalty = volatility * 0.2
    cal_error_penalty = calibration_error * 0.3

    return max(0.1, min(1.0, base_confidence - volatility_penalty - cal_error_penalty))
