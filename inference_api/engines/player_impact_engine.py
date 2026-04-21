"""
Player Impact Engine
Output: player_contribution_score, lineup_sensitivity_impact, match_influence_delta
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class PlayerStats:
    player_id: str
    name: str
    position: str           # SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH
    batting_avg: float = 0.250
    ops: float = 0.720
    era: Optional[float] = None    # pitchers only
    whip: Optional[float] = None
    recent_form: float = 0.0       # normalized -1 to 1 (last 10 games)
    fatigue_index: float = 0.0     # from physiological layer


@dataclass
class PlayerImpact:
    player_id: str
    name: str
    contribution_score: float    # 0–1, higher = more impact
    lineup_sensitivity: float    # how much lineup changes if this player sits
    match_influence_delta: float # predicted win prob shift with/without player


def compute_player_impact(
    players: list[PlayerStats],
    base_win_prob: float,
    top_n: int = 5,
) -> list[PlayerImpact]:
    scored = [_score_player(p, base_win_prob) for p in players]
    scored.sort(key=lambda x: x.contribution_score, reverse=True)
    return scored[:top_n]


def _score_player(p: PlayerStats, base_win_prob: float) -> PlayerImpact:
    if p.era is not None:
        contribution = _pitcher_contribution(p)
    else:
        contribution = _batter_contribution(p)

    # Fatigue reduces contribution
    effective = contribution * (1.0 - p.fatigue_index * 0.3)

    # Lineup sensitivity: higher for key positions (SP, cleanup hitters)
    lineup_sensitivity = _lineup_sensitivity(p.position, effective)

    # Win probability delta if this player is replaced by league average
    influence_delta = effective * 0.12 * (1.0 - p.fatigue_index)

    return PlayerImpact(
        player_id=p.player_id,
        name=p.name,
        contribution_score=round(min(1.0, effective), 4),
        lineup_sensitivity=round(lineup_sensitivity, 4),
        match_influence_delta=round(influence_delta, 4),
    )


def _pitcher_contribution(p: PlayerStats) -> float:
    era_score = max(0.0, 1.0 - (p.era or 4.5) / 9.0)
    whip_score = max(0.0, 1.0 - (p.whip or 1.3) / 2.0)
    form_bonus = p.recent_form * 0.15
    return (era_score * 0.5 + whip_score * 0.35 + form_bonus)


def _batter_contribution(p: PlayerStats) -> float:
    avg_score = p.batting_avg / 0.400
    ops_score = p.ops / 1.100
    form_bonus = p.recent_form * 0.10
    return (avg_score * 0.4 + ops_score * 0.5 + form_bonus)


def _lineup_sensitivity(position: str, contribution: float) -> float:
    high_impact = {"SP", "C", "SS", "CF"}
    medium_impact = {"RP", "1B", "3B", "LF", "RF", "DH"}
    if position in high_impact:
        return contribution * 0.9
    elif position in medium_impact:
        return contribution * 0.65
    return contribution * 0.45
