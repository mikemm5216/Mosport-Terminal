#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v3.2 -- Decision Layer Architecture
CEO ORDER: Separate probability from decision signal.

Architecture shift vs v3.1:
  1. base_prob -> isotonic(BASE OOF only) -> calibrated_prob [LOCKED, never modified]
  2. Simulation -> simulation_signal in [-1, +1] (never touches calibrated_prob)
  3. decision_score = calibrated_prob + ALPHA * simulation_signal
  4. Upset Branch Model: separate GBM for calibrated_prob < 0.44
     inputs: CMI, Miracle, Matchup Dominance, RISP, EV delta
  5. Label: STRONG / WEAK / CHAOS / UPSET
  6. Output per game: calibrated_prob + decision_score + label

CEO KPIs (v3.2):
  Accuracy        baseline credibility
  ECE             trust (calibrated_prob quality)
  Upset Precision alpha signal (UPSET label precision)
  Decision ROI    top-decile decision_score accuracy
"""

import json, math, random
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from scipy.special import expit as sigmoid
from sklearn.calibration import calibration_curve
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
)
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import cross_val_predict
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ─── Decision Layer Constants ─────────────────────────────────
ALPHA_DECISION  = 0.12   # simulation signal weight in decision score
UPSET_THRESHOLD = 0.44   # calibrated_prob < this -> upset candidate
UPSET_CONF_THR  = 0.54   # upset_model confidence to label UPSET
CHAOS_THR       = 0.65   # chaos_index threshold for CHAOS label
STRONG_EDGE     = 0.10   # |decision_score - 0.5| > this -> STRONG

# Upset model feature indices into FEATURE_NAMES:
# cmi_delta(12), home_miracle(13), away_miracle(14),
# ev_zscore_delta(8), risp_delta(19), miracle_x_rivalry(24)
UPSET_FEAT_IDX = [12, 13, 14, 8, 19, 24]

# ─────────────────────────────────────────────────────────────
# SECTION 0: TEAM DATA
# ─────────────────────────────────────────────────────────────

MLB_TEAMS: Dict[str, Dict] = {
    "NYY": {"div":"ALE","tz":-5,"win_rate_2021":0.580,"win_rate_2022":0.611,"win_rate_2023":0.556},
    "BOS": {"div":"ALE","tz":-5,"win_rate_2021":0.543,"win_rate_2022":0.481,"win_rate_2023":0.481},
    "TBR": {"div":"ALE","tz":-5,"win_rate_2021":0.605,"win_rate_2022":0.556,"win_rate_2023":0.549},
    "TOR": {"div":"ALE","tz":-5,"win_rate_2021":0.519,"win_rate_2022":0.574,"win_rate_2023":0.543},
    "BAL": {"div":"ALE","tz":-5,"win_rate_2021":0.401,"win_rate_2022":0.426,"win_rate_2023":0.611},
    "CWS": {"div":"ALC","tz":-6,"win_rate_2021":0.549,"win_rate_2022":0.500,"win_rate_2023":0.395},
    "MIN": {"div":"ALC","tz":-6,"win_rate_2021":0.481,"win_rate_2022":0.481,"win_rate_2023":0.543},
    "CLE": {"div":"ALC","tz":-5,"win_rate_2021":0.500,"win_rate_2022":0.543,"win_rate_2023":0.494},
    "KCR": {"div":"ALC","tz":-6,"win_rate_2021":0.463,"win_rate_2022":0.401,"win_rate_2023":0.346},
    "DET": {"div":"ALC","tz":-5,"win_rate_2021":0.401,"win_rate_2022":0.414,"win_rate_2023":0.438},
    "HOU": {"div":"ALW","tz":-6,"win_rate_2021":0.617,"win_rate_2022":0.654,"win_rate_2023":0.556},
    "OAK": {"div":"ALW","tz":-8,"win_rate_2021":0.481,"win_rate_2022":0.370,"win_rate_2023":0.296},
    "SEA": {"div":"ALW","tz":-8,"win_rate_2021":0.469,"win_rate_2022":0.556,"win_rate_2023":0.525},
    "LAA": {"div":"ALW","tz":-8,"win_rate_2021":0.488,"win_rate_2022":0.438,"win_rate_2023":0.426},
    "TEX": {"div":"ALW","tz":-6,"win_rate_2021":0.420,"win_rate_2022":0.432,"win_rate_2023":0.556},
    "ATL": {"div":"NLE","tz":-5,"win_rate_2021":0.549,"win_rate_2022":0.667,"win_rate_2023":0.642},
    "NYM": {"div":"NLE","tz":-5,"win_rate_2021":0.481,"win_rate_2022":0.599,"win_rate_2023":0.463},
    "PHI": {"div":"NLE","tz":-5,"win_rate_2021":0.494,"win_rate_2022":0.543,"win_rate_2023":0.556},
    "MIA": {"div":"NLE","tz":-5,"win_rate_2021":0.444,"win_rate_2022":0.444,"win_rate_2023":0.519},
    "WSN": {"div":"NLE","tz":-5,"win_rate_2021":0.420,"win_rate_2022":0.383,"win_rate_2023":0.377},
    "MIL": {"div":"NLC","tz":-6,"win_rate_2021":0.574,"win_rate_2022":0.519,"win_rate_2023":0.531},
    "CHC": {"div":"NLC","tz":-6,"win_rate_2021":0.481,"win_rate_2022":0.432,"win_rate_2023":0.488},
    "STL": {"div":"NLC","tz":-6,"win_rate_2021":0.531,"win_rate_2022":0.568,"win_rate_2023":0.463},
    "CIN": {"div":"NLC","tz":-5,"win_rate_2021":0.457,"win_rate_2022":0.395,"win_rate_2023":0.463},
    "PIT": {"div":"NLC","tz":-5,"win_rate_2021":0.401,"win_rate_2022":0.401,"win_rate_2023":0.451},
    "LAD": {"div":"NLW","tz":-8,"win_rate_2021":0.654,"win_rate_2022":0.667,"win_rate_2023":0.593},
    "SFG": {"div":"NLW","tz":-8,"win_rate_2021":0.648,"win_rate_2022":0.481,"win_rate_2023":0.469},
    "SDP": {"div":"NLW","tz":-8,"win_rate_2021":0.568,"win_rate_2022":0.549,"win_rate_2023":0.481},
    "COL": {"div":"NLW","tz":-7,"win_rate_2021":0.432,"win_rate_2022":0.414,"win_rate_2023":0.377},
    "ARI": {"div":"NLW","tz":-7,"win_rate_2021":0.401,"win_rate_2022":0.420,"win_rate_2023":0.531},
}
TEAM_CODES = list(MLB_TEAMS.keys())

TEAM_COORDS = {
    "NYY":(40.7,-74.0),"BOS":(42.3,-71.1),"TBR":(27.8,-82.6),"TOR":(43.6,-79.4),
    "BAL":(39.3,-76.6),"CWS":(41.8,-87.6),"MIN":(44.9,-93.3),"CLE":(41.5,-81.7),
    "KCR":(39.0,-94.5),"DET":(42.3,-83.0),"HOU":(29.8,-95.4),"OAK":(37.7,-122.2),
    "SEA":(47.6,-122.3),"LAA":(33.8,-117.9),"TEX":(32.7,-97.1),"ATL":(33.7,-84.4),
    "NYM":(40.7,-73.8),"PHI":(39.9,-75.2),"MIA":(25.8,-80.2),"WSN":(38.9,-77.0),
    "MIL":(43.0,-87.9),"CHC":(41.9,-87.7),"STL":(38.6,-90.2),"CIN":(39.1,-84.5),
    "PIT":(40.4,-80.0),"LAD":(34.1,-118.2),"SFG":(37.8,-122.4),"SDP":(32.7,-117.2),
    "COL":(39.7,-104.9),"ARI":(33.4,-112.1),
}

REAL_TEAM_EV_ZSCORE = {
    ("LAD",2021):0.82,("LAD",2022):0.91,("LAD",2023):0.75,
    ("HOU",2021):0.68,("HOU",2022):0.71,("HOU",2023):0.64,
    ("ATL",2021):0.54,("ATL",2022):0.78,("ATL",2023):0.81,
    ("NYY",2021):0.72,("NYY",2022):0.65,("NYY",2023):0.58,
    ("TBR",2021):0.31,("TBR",2022):0.28,("TBR",2023):0.35,
    ("TOR",2021):0.48,("TOR",2022):0.52,("TOR",2023):0.43,
    ("BAL",2021):-0.42,("BAL",2022):-0.28,("BAL",2023):0.51,
    ("BOS",2021):0.44,("BOS",2022):0.38,("BOS",2023):0.32,
    ("MIN",2021):0.21,("MIN",2022):0.18,("MIN",2023):0.25,
    ("CLE",2021):0.12,("CLE",2022):0.22,("CLE",2023):0.08,
    ("CWS",2021):0.55,("CWS",2022):0.42,("CWS",2023):-0.18,
    ("KCR",2021):-0.25,("KCR",2022):-0.35,("KCR",2023):-0.42,
    ("DET",2021):-0.38,("DET",2022):-0.31,("DET",2023):-0.22,
    ("OAK",2021):-0.15,("OAK",2022):-0.48,("OAK",2023):-0.72,
    ("SEA",2021):-0.08,("SEA",2022):0.32,("SEA",2023):0.28,
    ("LAA",2021):0.38,("LAA",2022):0.22,("LAA",2023):0.15,
    ("TEX",2021):-0.18,("TEX",2022):-0.12,("TEX",2023):0.44,
    ("NYM",2021):0.28,("NYM",2022):0.42,("NYM",2023):0.18,
    ("PHI",2021):0.35,("PHI",2022):0.48,("PHI",2023):0.52,
    ("MIA",2021):-0.22,("MIA",2022):-0.18,("MIA",2023):0.08,
    ("WSN",2021):-0.12,("WSN",2022):-0.38,("WSN",2023):-0.45,
    ("MIL",2021):0.18,("MIL",2022):0.12,("MIL",2023):0.21,
    ("CHC",2021):0.08,("CHC",2022):-0.08,("CHC",2023):0.04,
    ("STL",2021):0.22,("STL",2022):0.28,("STL",2023):0.12,
    ("CIN",2021):-0.08,("CIN",2022):-0.22,("CIN",2023):-0.08,
    ("PIT",2021):-0.32,("PIT",2022):-0.35,("PIT",2023):-0.18,
    ("SFG",2021):0.42,("SFG",2022):0.18,("SFG",2023):0.12,
    ("SDP",2021):0.38,("SDP",2022):0.35,("SDP",2023):0.22,
    ("COL",2021):-0.18,("COL",2022):-0.28,("COL",2023):-0.32,
    ("ARI",2021):-0.25,("ARI",2022):-0.15,("ARI",2023):0.28,
}

CMI_LAMBDA = 0.88
CMI_LOG: Dict[str, List[Tuple[date, float]]] = defaultdict(list)

def _cmi(team, ref, window=15):
    log = CMI_LOG[team][-window:]
    if not log: return 0.0
    total = w_sum = 0.0
    for d, v in log:
        t = max(0, (ref - d).days)
        w = math.exp(-CMI_LAMBDA * t)
        total += v * w; w_sum += w
    return max(-1.0, min(1.0, total / max(w_sum, 1e-6)))


# ─────────────────────────────────────────────────────────────
# SECTION 1: SIM FEATURES DATACLASS
# ─────────────────────────────────────────────────────────────

@dataclass
class SimFeatures:
    game_id: str
    home_win_rate: float; away_win_rate: float
    sp_load_delta: float        # away_sp - home_sp  (pos = home advantage)
    bp_depletion_delta: float   # away_bp - home_bp
    catcher_fatigue_delta: float
    circadian_pen: float
    home_bp_dep: float; away_bp_dep: float
    home_cmi: float;    away_cmi: float
    cmi_delta: float            # home - away
    ev_zscore_delta: float      # home - away
    era_diff: float             # away_era - home_era
    risp_delta: float
    home_revenge: float; away_revenge: float
    rivalry_factor: float
    home_mgr_tilt: float; away_mgr_tilt: float
    home_miracle: float; away_miracle: float
    home_ev_zscore: float; away_ev_zscore: float


# ─────────────────────────────────────────────────────────────
# SECTION 2: LEVERAGE TRIGGER (score-based gate -- same as v3.1)
# Gates whether simulation signal is applied to a given game.
# Does NOT modify probability.
# ─────────────────────────────────────────────────────────────

def _trigger_score(f: SimFeatures, base_prob: float) -> Tuple[int, List[str]]:
    score = 0; reasons = []
    if f.sp_load_delta < -0.25 and f.home_bp_dep > 0.45:
        score += 3; reasons.append("SP_COLLAPSE_EDGE")
    if f.away_cmi - f.home_cmi > 0.28 and f.away_miracle > 0.04:
        score += 3; reasons.append("AWAY_UPSET_THREAT")
    if abs(f.ev_zscore_delta) > 0.55 and abs(f.risp_delta) > 0.028:
        score += 2; reasons.append("MATCHUP_DOMINANCE")
    if f.home_bp_dep > 0.55 and f.away_bp_dep > 0.45:
        score += 2; reasons.append("LATE_GAME_BULLPEN_CRISIS")
    if f.circadian_pen > 0.55 and f.catcher_fatigue_delta > 0.20:
        score += 2; reasons.append("CIRCADIAN_STACK")
    if abs(base_prob - 0.5) < 0.05 and score >= 2:
        score += 1; reasons.append("CLOSE_GAME_AMPLIFIER")
    return score, reasons

def leverage_trigger(f: SimFeatures, base_prob: float) -> Tuple[bool, List[str]]:
    score, reasons = _trigger_score(f, base_prob)
    return score >= 3, reasons


# ─────────────────────────────────────────────────────────────
# SECTION 3: SIMULATION SIGNAL ENGINE (v3.2 -- NEW ARCHITECTURE)
# Simulation does NOT return a modified probability.
# It returns:
#   signal:      float in [-1, +1]  directional edge signal
#   chaos_index: float in [ 0,  1]  game variance measure
# ─────────────────────────────────────────────────────────────

def compute_simulation_signal(f: SimFeatures, N: int = 500,
                               rng: np.random.Generator = None
                               ) -> Tuple[float, float, Dict]:
    """
    All 8 MC events produce a directional signal (+ve = home advantage).
    Signal is normalized to [-1, +1].
    chaos_index = variance of the signal distribution.

    Returns: (signal, chaos_index, event_fire_rates)
    """
    if rng is None:
        rng = np.random.default_rng(RANDOM_SEED)

    signals = np.zeros(N)

    # EVENT 1: SP Collapse -- penalizes team with higher pitch load
    sp_dir = float(np.sign(f.sp_load_delta)) if f.sp_load_delta != 0 else 0.0
    sp_collapse_p = float(np.clip(sigmoid(abs(f.sp_load_delta) * 4.0 - 1.5) * 0.30, 0.02, 0.38))
    ev_sp = rng.random(N) < sp_collapse_p
    signals += ev_sp * sp_dir * rng.uniform(0.04, 0.09, N)

    # EVENT 2: Bullpen Depletion -- penalizes team with heavier usage
    bp_dir = float(np.sign(f.bp_depletion_delta)) if f.bp_depletion_delta != 0 else 0.0
    bp_p = float(np.clip(sigmoid(abs(f.bp_depletion_delta) * 3.5 - 1.0) * 0.28, 0.02, 0.35))
    ev_bp = rng.random(N) < bp_p
    signals += ev_bp * bp_dir * rng.uniform(0.025, 0.06, N)

    # EVENT 3: Circadian / Travel Fatigue -- always penalizes away (positive = home benefits)
    fatigue_p = float(np.clip(f.circadian_pen * 0.70, 0.0, 0.50))
    ev_fat = rng.random(N) < fatigue_p
    signals += ev_fat * rng.uniform(0.02, 0.05, N)

    # EVENT 4: CMI Momentum -- whoever leads in momentum benefits
    cmi_dir = float(np.sign(f.cmi_delta)) if f.cmi_delta != 0 else 0.0
    momentum_p = float(np.clip(sigmoid(abs(f.cmi_delta) * 3.0 - 0.5) * 0.35, 0.02, 0.42))
    ev_mom = rng.random(N) < momentum_p
    signals += ev_mom * cmi_dir * rng.uniform(0.015, 0.04, N)

    # EVENT 5: RISP Clutch -- team with higher RISP avg benefits
    risp_dir = float(np.sign(f.risp_delta)) if f.risp_delta != 0 else 0.0
    clutch_p = float(np.clip(sigmoid(abs(f.risp_delta) * 25.0 - 0.5) * 0.25, 0.01, 0.32))
    ev_risp = rng.random(N) < clutch_p
    signals += ev_risp * risp_dir * rng.uniform(0.02, 0.045, N)

    # EVENT 6: Chaos (revenge / rivalry) -- revenge-motivated team benefits
    net_revenge = f.away_revenge - f.home_revenge
    chaos_mag = abs(net_revenge) * 2.5 + (f.rivalry_factor - 1.0) * 1.5
    chaos_p = float(np.clip(sigmoid(chaos_mag - 0.5) * 0.22, 0.01, 0.28))
    chaos_dir = float(np.sign(net_revenge) * -1) if net_revenge != 0 else 0.0
    ev_chaos = rng.random(N) < chaos_p
    signals += ev_chaos * chaos_dir * rng.uniform(0.02, 0.055, N)

    # EVENT 7: Miracle Mode -- Statcast hot-streak player (capped 12%)
    miracle_net = f.home_miracle - f.away_miracle
    miracle_dir = float(np.sign(miracle_net)) if miracle_net != 0 else 0.0
    miracle_p = float(np.clip(sigmoid(abs(miracle_net) * 8.0 - 0.3) * 0.20, 0.0, 0.25))
    ev_mir = rng.random(N) < miracle_p
    signals += ev_mir * miracle_dir * np.clip(rng.normal(0.05, 0.02, N), 0.01, 0.12)

    # EVENT 8: Manager Tilt -- tilting manager costs their team edge
    tilt_net = f.away_mgr_tilt - f.home_mgr_tilt
    tilt_dir = float(np.sign(tilt_net)) if tilt_net != 0 else 0.0
    tilt_p = float(np.clip(abs(tilt_net) * 0.55, 0.0, 0.35))
    ev_tilt = rng.random(N) < tilt_p
    signals += ev_tilt * tilt_dir * rng.uniform(0.015, 0.035, N)

    mean_sig = float(np.mean(signals))
    std_sig  = float(np.std(signals))

    # Normalize to [-1, +1]: typical raw range is approx [-0.30, +0.30]
    normalized_signal = float(np.clip(mean_sig / 0.30, -1.0, 1.0))

    # Chaos index: high std = unpredictable game
    chaos_index = float(min(1.0, std_sig / 0.15))

    fire_rates = {
        "sp_collapse": round(float(ev_sp.mean()),  3),
        "bullpen":     round(float(ev_bp.mean()),  3),
        "fatigue":     round(float(ev_fat.mean()), 3),
        "momentum":    round(float(ev_mom.mean()), 3),
        "risp_clutch": round(float(ev_risp.mean()),3),
        "chaos":       round(float(ev_chaos.mean()),3),
        "miracle":     round(float(ev_mir.mean()), 3),
        "mgr_tilt":    round(float(ev_tilt.mean()),3),
    }
    return normalized_signal, chaos_index, fire_rates


def compute_matchup_score(f: SimFeatures) -> float:
    """Composite score for Micro-Matchup Engine. Positive = home advantage."""
    arsenal  = f.ev_zscore_delta * 0.35
    bvp      = f.risp_delta * 6.0 + f.era_diff * 0.06
    fatigue  = f.sp_load_delta * (-0.25) + f.bp_depletion_delta * (-0.18)
    psych    = f.cmi_delta * 0.25
    chaos    = (f.home_revenge - f.away_revenge) * 1.5
    return arsenal + bvp + fatigue + psych + chaos


# ─────────────────────────────────────────────────────────────
# SECTION 4: DATASET + FEATURES (identical seed to v2.3/v3.x)
# ─────────────────────────────────────────────────────────────

def _haversine(c1, c2):
    R = 6371.0
    lat1,lon1 = math.radians(c1[0]),math.radians(c1[1])
    lat2,lon2 = math.radians(c2[0]),math.radians(c2[1])
    dlat,dlon = lat2-lat1,lon2-lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R*2*math.asin(math.sqrt(a))

def _era_from_wr(wr):
    base = 5.5 - (wr - 0.3) * 8.0
    return round(max(3.0, min(5.5, base + random.gauss(0, 0.25))), 2)

def get_ev_z(team, season):
    return REAL_TEAM_EV_ZSCORE.get((team, season), 0.0)

def generate_dataset(seasons):
    records = []
    game_ctr = 0
    streaks   = defaultdict(int)
    sp_pitch: Dict[str, deque] = defaultdict(lambda: deque(maxlen=3))
    bp_log:   Dict[str, deque] = defaultdict(lambda: deque(maxlen=15))
    cat_con   = defaultdict(int)
    cat_log:  Dict[str, deque] = defaultdict(lambda: deque(maxlen=7))
    last_gd:  Dict[str, date]  = {}
    h2h:      Dict[str, deque] = defaultdict(lambda: deque(maxlen=3))
    rec_res:  Dict[str, deque] = defaultdict(lambda: deque(maxlen=5))
    risp_bat: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10))

    for season in seasons:
        matchups = []
        for home in TEAM_CODES:
            for away in TEAM_CODES:
                if home == away: continue
                n = 6 if MLB_TEAMS[home]["div"] == MLB_TEAMS[away]["div"] else 3
                for _ in range(n): matchups.append((home, away))
        random.shuffle(matchups)
        ss = date(season, 4, 1)

        for idx, (home, away) in enumerate(matchups):
            gd  = ss + timedelta(days=idx // 15)
            gid = f"MLB-{season}-{game_ctr+1:05d}"
            hwr = MLB_TEAMS[home][f"win_rate_{season}"]
            awr = MLB_TEAMS[away][f"win_rate_{season}"]
            hev = get_ev_z(home, season); aev = get_ev_z(away, season)
            hcmi = _cmi(home, gd);        acmi = _cmi(away, gd)

            def sl(t):
                if not sp_pitch[t]: return 0.3
                return min(1.0, sum(pc*math.exp(-(gd-d).days/5.0) for d,pc in sp_pitch[t])/300.0)
            def bd(t):
                return min(1.0, sum(i for d,i in bp_log[t] if (gd-d).days<=3)/9.0)
            def cf(t):
                c = min(1.0, cat_con[t]/6.0)
                dn= 0.35 if (cat_log[t] and cat_log[t][-1][1] and (gd-cat_log[t][-1][0]).days==1) else 0.0
                return min(1.0, c*0.65+dn)
            def circ(ft, tt):
                dtz = MLB_TEAMS[tt]["tz"] - MLB_TEAMS[ft]["tz"]
                if dtz > 0: return min(1.0, dtz/4.0*1.4)
                if dtz < 0: return min(1.0, abs(dtz)/4.0*0.7)
                return 0.0
            def rev(loser, winner):
                k=f"{loser}_{winner}"; h=list(h2h.get(k,[]))
                if len(h)>=3 and all(r==0 for r in h[-3:]): return 0.12
                if len(h)>=2 and all(r==0 for r in h[-2:]): return 0.06
                return 0.0
            def risp_d():
                hb=list(risp_bat[home]); ab=list(risp_bat[away])
                return (np.mean(hb) if hb else 0.255)-(np.mean(ab) if ab else 0.255)
            def tilt(t):
                r=list(rec_res[t]); c=0
                for x in reversed(r):
                    if x==0: c+=1
                    else: break
                return min(1.0, c/4.0)

            hsl=sl(home); asl=sl(away); hbd=bd(home); abd=bd(away)
            hcf=cf(home); acf=cf(away)
            cp=circ(away,home); rd=risp_d()
            hr=rev(away,home); ar=rev(home,away)
            ht=tilt(home); at=tilt(away)
            rv=1.25 if MLB_TEAMS[home]["div"]==MLB_TEAMS[away]["div"] else 1.0
            hera=_era_from_wr(hwr); aera=_era_from_wr(awr)
            tkm=_haversine(TEAM_COORDS[away],TEAM_COORDS[home])
            sh=streaks[home]; sa=streaks[away]
            hmir=min(0.12,max(0.0,(hcmi-0.5)*0.15+hev*0.03))
            amir=min(0.12,max(0.0,(acmi-0.5)*0.15+aev*0.03))

            base=(0.50+0.035+(hwr-awr)*0.55+(hev-aev)*0.025+(hcmi-acmi)*0.055
                  +(asl-hsl)*0.04+(abd-hbd)*0.03+(acf-hcf)*0.025
                  +cp*0.03+(aera-hera)*0.015+rd*0.04
                  -ar*0.05+hr*0.03-ht*0.025+at*0.025
                  +math.tanh(sh/5.0)*0.015-math.tanh(sa/5.0)*0.015)
            if rv > 1.0: base = 0.5 + (base - 0.5) * 0.91
            base += hmir - amir
            tp = max(0.10, min(0.90, base))
            hw = 1 if random.random() < tp else 0

            rh=int(np.clip(np.random.poisson(4.5+hwr*2),0,15))
            ra=int(np.clip(np.random.poisson(4.5+awr*2),0,15))
            hh=int(np.clip(np.random.poisson(8+hwr*3),3,18))
            ah=int(np.clip(np.random.poisson(8+awr*3),3,18))
            sph=int(np.clip(np.random.normal(90,12),60,115))
            spa=int(np.clip(np.random.normal(90,12),60,115))
            bih=round(np.clip(np.random.normal(2.5,0.8),0,6),1)
            bia=round(np.clip(np.random.normal(2.5,0.8),0,6),1)
            isn=random.random()<0.65
            rh2=max(0.18,min(0.32,np.random.normal(0.248+(hwr-0.5)*0.15,0.015)))
            ra2=max(0.18,min(0.32,np.random.normal(0.248+(awr-0.5)*0.15,0.015)))
            sg=((hwr-awr)*28+random.gauss(0,2.0))
            sh2=min(1.0,max(-1.0,sh*0.08+random.gauss(0,0.12)))
            sa2=min(1.0,max(-1.0,sa*0.08+random.gauss(0,0.12)))

            game_ctr += 1
            records.append({
                "game_id":gid,"season":season,"game_date":gd,
                "home_team":home,"away_team":away,"home_win":hw,
                "home_win_rate":hwr,"away_win_rate":awr,"home_era":hera,"away_era":aera,
                "home_streak":sh,"away_streak":sa,"standings_gap":round(sg,1),
                "travel_km":round(tkm,1),"sentiment_home":round(sh2,3),"sentiment_away":round(sa2,3),
                "home_ev_zscore":round(hev,4),"away_ev_zscore":round(aev,4),
                "home_cmi":round(hcmi,4),"away_cmi":round(acmi,4),
                "home_miracle":round(hmir,4),"away_miracle":round(amir,4),
                "home_sp_load":round(hsl,4),"away_sp_load":round(asl,4),
                "home_bp_dep":round(hbd,4),"away_bp_dep":round(abd,4),
                "home_cat_fat":round(hcf,4),"away_cat_fat":round(acf,4),
                "circadian_pen":round(cp,4),"risp_delta":round(rd,4),
                "home_revenge":round(hr,4),"away_revenge":round(ar,4),
                "home_mgr_tilt":round(ht,4),"away_mgr_tilt":round(at,4),
                "rivalry_factor":rv,
            })

            wv=1.0 if hw else -1.0
            rdv=max(-1.0,min(1.0,(rh-ra)/8.0))
            CMI_LOG[home].append((gd, wv*0.5+rdv*0.3+min(1.0,max(-1.0,(hh-8)/6.0))*0.2))
            CMI_LOG[away].append((gd,-wv*0.5+(-rdv)*0.3+min(1.0,max(-1.0,(ah-8)/6.0))*0.2))

            streaks[home]=max(-10,min(10,streaks[home]+(1 if hw else -1)))
            streaks[away]=max(-10,min(10,streaks[away]+(-1 if hw else 1)))
            sp_pitch[home].append((gd,sph)); sp_pitch[away].append((gd,spa))
            bp_log[home].append((gd,bih)); bp_log[away].append((gd,bia))
            cat_log[home].append((gd,isn)); cat_log[away].append((gd,isn))
            lh=last_gd.get(home); la=last_gd.get(away)
            cat_con[home]=(cat_con[home]+1) if (lh and (gd-lh).days<=1) else 1
            cat_con[away]=(cat_con[away]+1) if (la and (gd-la).days<=1) else 1
            risp_bat[home].append(rh2); risp_bat[away].append(ra2)
            h2h[f"{home}_{away}"].append(1 if hw else 0)
            h2h[f"{away}_{home}"].append(0 if hw else 1)
            rec_res[home].append(1 if hw else 0); rec_res[away].append(0 if hw else 1)
            last_gd[home]=gd; last_gd[away]=gd

    return pd.DataFrame(records)


FEATURE_NAMES = [
    "win_rate_delta","home_streak_momentum","away_streak_momentum",
    "era_differential","away_travel_score","pressure_index",
    "sentiment_diff","rivalry_multiplier","ev_zscore_delta","ev_zscore_home",
    "home_cmi","away_cmi","cmi_delta","home_miracle_boost","away_miracle_boost",
    "sp_load_delta","bp_depletion_delta","catcher_fatigue_delta","circadian_pen",
    "risp_delta","net_revenge_delta","mgr_tilt_delta","home_momentum_composite",
    "cmi_x_ev_delta","miracle_x_rivalry",
]

def build_features(df):
    X = np.zeros((len(df), len(FEATURE_NAMES)))
    for i, r in enumerate(df.itertuples(index=False)):
        hs=math.tanh(r.home_streak/5.0); as_=math.tanh(r.away_streak/5.0)
        ev_d=r.home_ev_zscore-r.away_ev_zscore; cm_d=r.home_cmi-r.away_cmi
        X[i,0]=r.home_win_rate-r.away_win_rate; X[i,1]=hs; X[i,2]=as_
        X[i,3]=max(-3.0,min(3.0,r.away_era-r.home_era))
        X[i,4]=min(1.0,r.travel_km/5000.0)
        X[i,5]=max(-1.0,min(1.0,r.standings_gap/10.0))
        X[i,6]=r.sentiment_home-r.sentiment_away; X[i,7]=r.rivalry_factor
        X[i,8]=ev_d; X[i,9]=r.home_ev_zscore
        X[i,10]=r.home_cmi; X[i,11]=r.away_cmi; X[i,12]=cm_d
        X[i,13]=r.home_miracle; X[i,14]=r.away_miracle
        X[i,15]=r.away_sp_load-r.home_sp_load
        X[i,16]=r.away_bp_dep-r.home_bp_dep
        X[i,17]=r.away_cat_fat-r.home_cat_fat; X[i,18]=r.circadian_pen
        X[i,19]=r.risp_delta; X[i,20]=r.away_revenge-r.home_revenge
        X[i,21]=r.away_mgr_tilt-r.home_mgr_tilt
        X[i,22]=(r.home_win_rate-0.5)*0.4+hs*0.35+r.home_cmi*0.25
        X[i,23]=cm_d*ev_d
        X[i,24]=(r.home_miracle-r.away_miracle)*r.rivalry_factor
    return X


# ─────────────────────────────────────────────────────────────
# SECTION 5: BASE ENSEMBLE (v2.3 identical config)
# ─────────────────────────────────────────────────────────────

class BaseEnsemble:
    name = "MoSport v2.3 (base)"
    def __init__(self):
        self.stack = StackingClassifier(
            estimators=[
                ("xgb", xgb.XGBClassifier(
                    n_estimators=500, max_depth=5, learning_rate=0.035,
                    subsample=0.75, colsample_bytree=0.75, min_child_weight=4,
                    gamma=0.15, reg_alpha=0.08, reg_lambda=2.0,
                    use_label_encoder=False, eval_metric="logloss",
                    random_state=RANDOM_SEED, verbosity=0)),
                ("lgb", lgb.LGBMClassifier(
                    n_estimators=500, num_leaves=31, learning_rate=0.035,
                    subsample=0.75, colsample_bytree=0.75, min_child_samples=25,
                    reg_alpha=0.08, reg_lambda=2.0,
                    random_state=RANDOM_SEED, verbosity=-1)),
                ("rf", RandomForestClassifier(
                    n_estimators=500, max_depth=10, min_samples_leaf=18,
                    max_features="sqrt", random_state=RANDOM_SEED, n_jobs=-1)),
            ],
            final_estimator=LogisticRegression(C=0.3, max_iter=500,
                                               random_state=RANDOM_SEED),
            cv=5, stack_method="predict_proba", passthrough=True, n_jobs=-1,
        )
        self.scaler = StandardScaler()

    def fit(self, X, y):
        self.stack.fit(self.scaler.fit_transform(X), y)

    def predict_proba(self, X) -> np.ndarray:
        return self.stack.predict_proba(self.scaler.transform(X))[:, 1]

    def oof_proba(self, X, y) -> np.ndarray:
        """Out-of-fold predictions on training set (5-fold)."""
        Xs = self.scaler.transform(X)
        return cross_val_predict(self.stack, Xs, y, cv=5,
                                 method="predict_proba")[:, 1]


# ─────────────────────────────────────────────────────────────
# SECTION 6: CALIBRATION -- FIT ON BASE OOF ONLY [KEY FIX]
# Never fit on simulation outputs.
# ─────────────────────────────────────────────────────────────

class BaseCalibrator:
    """
    IsotonicRegression fitted exclusively on base model OOF predictions.
    Simulation signal is added AFTER this step and never re-calibrated.
    """
    def __init__(self):
        self.ir = IsotonicRegression(out_of_bounds="clip", increasing=True)
        self._fitted = False

    def fit(self, base_oof_probs: np.ndarray, y: np.ndarray):
        self.ir.fit(base_oof_probs, y)
        self._fitted = True

    def transform(self, base_probs: np.ndarray) -> np.ndarray:
        if not self._fitted:
            return base_probs
        return self.ir.transform(base_probs)


# ─────────────────────────────────────────────────────────────
# SECTION 7: UPSET BRANCH MODEL
# Trained only on upset-candidate games (calibrated_prob < 0.44)
# from the training set, using CEO-specified features:
#   CMI delta, Miracle (home/away), EV delta, RISP delta,
#   miracle_x_rivalry (interaction term)
# ─────────────────────────────────────────────────────────────

class UpsetBranchModel:
    """
    Separate GBM path for upset candidates.
    Learns: "given the home team is the underdog, which features
    predict they actually pull the upset?"
    Output: upset_confidence = P(home_win | upset_candidate)
    """
    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=200, max_depth=3, learning_rate=0.05,
            subsample=0.8, min_samples_leaf=10, random_state=RANDOM_SEED,
        )
        self._fitted = False
        self.n_train_samples = 0

    def fit(self, X_train: np.ndarray, y_train: np.ndarray,
            calibrated_probs_train: np.ndarray):
        mask = calibrated_probs_train < UPSET_THRESHOLD
        self.n_train_samples = int(mask.sum())
        if self.n_train_samples < 30:
            return  # too few samples to train reliably
        X_u = X_train[mask][:, UPSET_FEAT_IDX]
        y_u = y_train[mask]
        self.model.fit(X_u, y_u)
        self._fitted = True

    def predict_confidence(self, X: np.ndarray,
                           calibrated_probs: np.ndarray) -> np.ndarray:
        """Returns upset_confidence for each game. Non-candidates get 0.0."""
        conf = np.zeros(len(X))
        if not self._fitted:
            return conf
        mask = calibrated_probs < UPSET_THRESHOLD
        if mask.sum() == 0:
            return conf
        X_u = X[mask][:, UPSET_FEAT_IDX]
        conf[mask] = self.model.predict_proba(X_u)[:, 1]
        return conf


# ─────────────────────────────────────────────────────────────
# SECTION 8: DECISION LAYER
# ─────────────────────────────────────────────────────────────

def build_decision_score(calibrated_prob: float, sim_signal: float,
                         triggered: bool) -> float:
    """
    decision_score = calibrated_prob + ALPHA * simulation_signal
    Simulation signal only applied when leverage trigger fires.
    calibrated_prob is NEVER modified -- decision_score is a separate output.
    """
    if triggered:
        raw = calibrated_prob + ALPHA_DECISION * sim_signal
    else:
        raw = calibrated_prob
    return float(np.clip(raw, 0.04, 0.96))


def classify_label(calibrated_prob: float, decision_score: float,
                   upset_confidence: float, chaos_index: float) -> str:
    """
    UPSET   : underdog candidate + upset model high confidence
    CHAOS   : high game-state variance (risky, no clear edge)
    STRONG  : clear directional edge (recommended action)
    WEAK    : no sufficient signal (no recommendation)
    """
    is_upset_candidate = calibrated_prob < UPSET_THRESHOLD
    if is_upset_candidate and upset_confidence > UPSET_CONF_THR:
        return "UPSET"
    if chaos_index > CHAOS_THR:
        return "CHAOS"
    if abs(decision_score - 0.5) > STRONG_EDGE:
        return "STRONG"
    return "WEAK"


# ─────────────────────────────────────────────────────────────
# SECTION 9: BASELINES
# ─────────────────────────────────────────────────────────────

class RandomBaseline:
    name = "Random Baseline"
    def predict_proba(self, X): return np.full(len(X), 0.5)

class VegasProxy:
    name = "Vegas Odds Proxy"
    def predict_proba(self, df):
        p = []
        for _, r in df.iterrows():
            b = 0.5 + 0.038 + (r.home_win_rate - r.away_win_rate) * 0.55
            b = 0.5 + (b - 0.5) * 0.85
            p.append(max(0.10, min(0.90, b)))
        return np.array(p)

class EloModel:
    name = "Elo Rating Model"
    K = 24
    def __init__(self): self.r = {}
    def _g(self, t): return self.r.get(t, 1500.0)
    def _e(self, ra, rb): return 1.0 / (1.0 + 10**((rb - ra) / 400.0))
    def update(self, h, a, hw):
        ra, rb = self._g(h), self._g(a); ea = self._e(ra, rb)
        self.r[h] = ra + self.K*(float(hw)-ea)
        self.r[a] = rb + self.K*((1-float(hw))-(1-ea))
    def predict_prob(self, h, a): return self._e(self._g(h)+30.0, self._g(a))


# ─────────────────────────────────────────────────────────────
# SECTION 10: EVALUATION ENGINE
# ─────────────────────────────────────────────────────────────

def accuracy(p, y):       return float(np.mean((p >= 0.5).astype(int) == y))
def brier(p, y):          return float(brier_score_loss(y, p))

def ece_score(p, y, n=10):
    e = np.linspace(0, 1, n+1); ece = 0.0
    for i in range(n):
        m = (p >= e[i]) & (p < e[i+1])
        if m.sum() == 0: continue
        ece += (m.sum()/len(p)) * abs(p[m].mean() - y[m].mean())
    return round(ece, 4)

def upset_stats(p, y, thr=0.40):
    mask = p < thr
    if mask.sum() == 0:
        return {"n":0, "rate":0.0, "coverage":0.0}
    return {"n":int(mask.sum()),
            "rate":round(float(y[mask].mean()), 4),
            "coverage":round(float(mask.sum()/len(p)), 4)}

def roi_proxy(decision_scores, y, top_pct=0.10):
    """Top decile accuracy by |decision_score - 0.5|."""
    edge = np.abs(decision_scores - 0.5)
    n_top = max(1, int(len(y) * top_pct))
    top_idx = np.argsort(edge)[-n_top:]
    top_preds = (decision_scores[top_idx] >= 0.5).astype(int)
    top_acc = float(np.mean(top_preds == y[top_idx]))
    return {"n_games": n_top, "accuracy": round(top_acc, 4)}

def decision_distribution(labels):
    total = len(labels)
    counts = {l: labels.count(l) for l in ["STRONG","WEAK","CHAOS","UPSET"]}
    pcts   = {l: round(counts[l]/total, 3) for l in counts}
    return {"counts": counts, "pcts": pcts}

def upset_precision(labels, calibrated_probs, y):
    """Among UPSET-labeled games, what fraction actually had home_win=1?"""
    upset_idx = [i for i,l in enumerate(labels) if l == "UPSET"]
    if not upset_idx:
        return {"n":0, "precision":0.0}
    actual = y[upset_idx]
    return {"n": len(upset_idx), "precision": round(float(actual.mean()), 4)}

def sig_test(pm, pb, y):
    bsa = (pm-y)**2; bsb = (pb-y)**2; diff = bsb - bsa
    _, pv = stats.ttest_1samp(diff, 0)
    rng = np.random.default_rng(RANDOM_SEED)
    boots = [rng.choice(diff, len(diff), replace=True).mean() for _ in range(2000)]
    return {"brier_delta":round(float(diff.mean()),5),
            "p_value":round(float(pv),4),
            "significant":bool(pv < 0.05 and diff.mean() > 0)}

def cal_display(p, y, n=9):
    fp, mp = calibration_curve(y, p, n_bins=n, strategy="uniform")
    lines = []
    for pred_val, frac_pos in zip(mp, fp):
        bar = "#" * int(frac_pos * 20)
        lines.append(f"    {pred_val:.2f} -> {frac_pos:.2f}  {bar}")
    return lines


# ─────────────────────────────────────────────────────────────
# SECTION 11: MAIN PIPELINE
# ─────────────────────────────────────────────────────────────

def run_backtest_v32() -> Dict:
    print("=" * 68)
    print("  MoSport v3.2 -- Decision Layer Architecture")
    print("  Probability LOCKED after calibration. Simulation = Signal only.")
    print("=" * 68)

    # ── Step 1: Dataset ────────────────────────────────────────
    print("\n[STEP 1] Generating dataset (same seed as v2.3/v3.x)...")
    df = generate_dataset([2021, 2022, 2023])
    df_train = df[df.season.isin([2021,2022])].reset_index(drop=True)
    df_test  = df[df.season == 2023].sort_values("game_date").reset_index(drop=True)
    X_train = build_features(df_train); y_train = df_train["home_win"].values
    X_test  = build_features(df_test);  y_test  = df_test["home_win"].values
    print(f"  Train:{len(df_train):,}  Test:{len(df_test):,}")

    # ── Step 2: Baselines ──────────────────────────────────────
    print("\n[STEP 2] Baselines...")
    random_probs = RandomBaseline().predict_proba(X_test)
    vegas_probs  = VegasProxy().predict_proba(df_test)
    elo = EloModel()
    for _, r in df_train.sort_values("game_date").iterrows():
        elo.update(r.home_team, r.away_team, r.home_win)
    elo_probs = np.zeros(len(df_test))
    for i, (_, r) in enumerate(df_test.iterrows()):
        elo_probs[i] = elo.predict_prob(r.home_team, r.away_team)
        elo.update(r.home_team, r.away_team, r.home_win)
    print("  [OK] Random / Elo / Vegas")

    # ── Step 3: Train Base Ensemble ────────────────────────────
    print("\n[STEP 3] Training base ensemble (v2.3 config)...")
    ensemble = BaseEnsemble()
    ensemble.fit(X_train, y_train)
    base_probs_test = ensemble.predict_proba(X_test)
    print("  [OK] Ensemble trained")

    # ── Step 4: Calibration on BASE OOF [KEY FIX] ─────────────
    print("\n[STEP 4] Isotonic calibration on BASE OOF (no simulation)...")
    base_oof = ensemble.oof_proba(X_train, y_train)
    calibrator = BaseCalibrator()
    calibrator.fit(base_oof, y_train)
    calibrated_probs = calibrator.transform(base_probs_test)
    calibrated_probs = np.clip(calibrated_probs, 0.04, 0.96)
    # Also calibrate training OOF for upset model training
    calibrated_train_oof = calibrator.transform(base_oof)
    calibrated_train_oof = np.clip(calibrated_train_oof, 0.04, 0.96)
    print(f"  [OK] ECE before: {ece_score(base_probs_test, y_test):.4f}  "
          f"after: {ece_score(calibrated_probs, y_test):.4f}")

    # ── Step 5: Upset Branch Model ─────────────────────────────
    print("\n[STEP 5] Training Upset Branch Model (CMI+Miracle+Matchup)...")
    upset_model = UpsetBranchModel()
    upset_model.fit(X_train, y_train, calibrated_train_oof)
    upset_confidence = upset_model.predict_confidence(X_test, calibrated_probs)
    n_upset_cands = int((calibrated_probs < UPSET_THRESHOLD).sum())
    print(f"  [OK] Trained on {upset_model.n_train_samples:,} upset-candidate "
          f"training games | Test candidates: {n_upset_cands:,}")

    # ── Step 6: Simulation Signal + Decision Layer ─────────────
    print("\n[STEP 6] Simulation Signal + Decision Layer...")
    rng_master = np.random.default_rng(RANDOM_SEED)

    decision_scores  = np.zeros(len(df_test))
    sim_signals      = np.zeros(len(df_test))
    chaos_indices    = np.zeros(len(df_test))
    labels           = []
    n_triggered      = 0
    trigger_reasons_all: Dict[str, int] = defaultdict(int)
    all_fire_rates   = []

    for i, row in enumerate(df_test.itertuples(index=False)):
        f = SimFeatures(
            game_id=row.game_id,
            home_win_rate=row.home_win_rate, away_win_rate=row.away_win_rate,
            sp_load_delta=row.away_sp_load-row.home_sp_load,
            bp_depletion_delta=row.away_bp_dep-row.home_bp_dep,
            catcher_fatigue_delta=row.away_cat_fat-row.home_cat_fat,
            circadian_pen=row.circadian_pen,
            home_bp_dep=row.home_bp_dep, away_bp_dep=row.away_bp_dep,
            home_cmi=row.home_cmi, away_cmi=row.away_cmi,
            cmi_delta=row.home_cmi-row.away_cmi,
            ev_zscore_delta=row.home_ev_zscore-row.away_ev_zscore,
            era_diff=row.away_era-row.home_era,
            risp_delta=row.risp_delta,
            home_revenge=row.home_revenge, away_revenge=row.away_revenge,
            rivalry_factor=row.rivalry_factor,
            home_mgr_tilt=row.home_mgr_tilt, away_mgr_tilt=row.away_mgr_tilt,
            home_miracle=row.home_miracle, away_miracle=row.away_miracle,
            home_ev_zscore=row.home_ev_zscore, away_ev_zscore=row.away_ev_zscore,
        )
        gseed = int(rng_master.integers(0, 2**31))
        grng  = np.random.default_rng(gseed)

        # Compute simulation signal (NEVER modifies calibrated_prob)
        sig, chaos_idx, fire_rates = compute_simulation_signal(f, N=500, rng=grng)
        triggered, reasons = leverage_trigger(f, float(calibrated_probs[i]))

        sim_signals[i]   = sig
        chaos_indices[i] = chaos_idx

        # Decision score: calibrated_prob is LOCKED, signal is additive only
        decision_scores[i] = build_decision_score(
            float(calibrated_probs[i]), sig, triggered
        )

        # Label classification
        lbl = classify_label(
            float(calibrated_probs[i]),
            float(decision_scores[i]),
            float(upset_confidence[i]),
            chaos_idx,
        )
        labels.append(lbl)

        if triggered:
            n_triggered += 1
            for r in reasons:
                trigger_reasons_all[r] += 1
        all_fire_rates.append(fire_rates)

    trigger_rate = n_triggered / len(df_test)
    print(f"  [OK] Signal computed | trigger rate: {trigger_rate:.1%}")

    # ── Step 7: Evaluation ─────────────────────────────────────
    print("\n[STEP 7] Evaluation...")

    models = {
        "Random Baseline":    random_probs,
        "Elo Rating Model":   elo_probs,
        "Vegas Odds Proxy":   vegas_probs,
        "MoSport v2.3 (base)":base_probs_test,
        "MoSport v3.1":       None,  # placeholder for comparison display
        "MoSport v3.2 (cal)": calibrated_probs,     # calibrated prob only
        "MoSport v3.2 (dec)": decision_scores,       # decision score
    }

    # v3.1 reference numbers (from last run)
    v31_ref = {"acc":0.6125,"brier":0.2311,"ece":0.0147}
    v23_ref = {"acc":0.6148,"brier":0.2312,"ece":0.0129}

    results = {}
    for name, p in models.items():
        if p is None: continue
        results[name] = {
            "accuracy": round(accuracy(p, y_test), 4),
            "brier":    round(brier(p, y_test), 4),
            "ece":      ece_score(p, y_test),
        }

    # Decision distribution
    dec_dist = decision_distribution(labels)

    # Upset precision (UPSET-labeled games)
    up_prec = upset_precision(labels, calibrated_probs, y_test)

    # ROI proxy: top decile by |decision_score - 0.5|
    roi = roi_proxy(decision_scores, y_test, top_pct=0.10)

    # Upset stats (using calibrated_prob < 0.40 mask, for comparison with prior versions)
    upset_by_model = {}
    for name, p in [("Random", random_probs), ("Elo", elo_probs),
                    ("Vegas", vegas_probs), ("v2.3 base", base_probs_test),
                    ("v3.2 cal", calibrated_probs), ("v3.2 dec", decision_scores)]:
        upset_by_model[name] = upset_stats(p, y_test)

    # Sig tests
    sig_vs_v23  = sig_test(decision_scores, base_probs_test, y_test)
    sig_vs_vegas = sig_test(decision_scores, vegas_probs, y_test)

    # Avg event fire rates
    avg_fire_rates = {}
    for ev in ["sp_collapse","bullpen","fatigue","momentum",
               "risp_clutch","chaos","miracle","mgr_tilt"]:
        avg_fire_rates[ev] = round(float(np.mean([r[ev] for r in all_fire_rates])), 3)

    # ── Assemble result dict ────────────────────────────────────
    return {
        "version": "v3.2",
        "dataset": {"train":len(df_train),"test":len(df_test)},
        "model_metrics": results,
        "v31_ref": v31_ref,
        "v23_ref": v23_ref,
        "decision_distribution": dec_dist,
        "upset_precision_label": up_prec,
        "roi_proxy_top10pct": roi,
        "upset_stats_by_model": upset_by_model,
        "trigger_analysis": {
            "rate": round(trigger_rate, 4),
            "n_triggered": n_triggered,
            "reasons": dict(trigger_reasons_all),
        },
        "simulation_signal_stats": {
            "mean": round(float(sim_signals.mean()), 4),
            "std":  round(float(sim_signals.std()),  4),
            "mean_chaos_index": round(float(chaos_indices.mean()), 4),
        },
        "avg_event_fire_rates": avg_fire_rates,
        "sig_tests": {
            "v32_dec_vs_v23_base": sig_vs_v23,
            "v32_dec_vs_vegas":    sig_vs_vegas,
        },
        "upset_model": {
            "n_train_samples": upset_model.n_train_samples,
            "n_test_candidates": n_upset_cands,
            "fitted": upset_model._fitted,
        },
        "labels_sample": labels[:20],
    }, results, dec_dist, up_prec, roi, upset_by_model, calibrated_probs, \
       decision_scores, base_probs_test, y_test, labels, chaos_indices, \
       trigger_rate, trigger_reasons_all, avg_fire_rates, sig_vs_v23, sig_vs_vegas, \
       upset_model.n_train_samples, n_upset_cands


# ─────────────────────────────────────────────────────────────
# SECTION 12: REPORT PRINTER
# ─────────────────────────────────────────────────────────────

def print_report(results, dec_dist, up_prec, roi, upset_by_model,
                 calibrated_probs, decision_scores, base_probs_test,
                 y_test, labels, chaos_indices,
                 trigger_rate, trigger_reasons_all, avg_fire_rates,
                 sig_vs_v23, sig_vs_vegas,
                 n_upset_train, n_upset_test):

    sep = "=" * 68
    print(f"\n{sep}")
    print("  MoSport v3.2 -- Decision Layer Report")
    print(sep)

    # ── CEO KPI Verification ───────────────────────────────────
    acc_cal  = results["MoSport v3.2 (cal)"]["accuracy"]
    acc_dec  = results["MoSport v3.2 (dec)"]["accuracy"]
    ece_cal  = results["MoSport v3.2 (cal)"]["ece"]
    acc_v23  = results["MoSport v2.3 (base)"]["accuracy"]
    acc_vegas= results["Vegas Odds Proxy"]["accuracy"]

    print("\n-- CEO KPI VERIFICATION --")
    kpi_acc  = acc_dec > 0.6104
    kpi_ece  = ece_cal < 0.010
    kpi_roi  = roi["accuracy"] > 0.64
    kpi_trig = trigger_rate <= 0.40
    kpi_veg  = acc_dec > acc_vegas
    kpi_up   = up_prec["n"] > 0

    print(f"  Accuracy > 61.04%       : {'PASS' if kpi_acc else 'FAIL'}  ({acc_dec:.4f})")
    print(f"  ECE < 0.010             : {'PASS' if kpi_ece else 'FAIL'}  ({ece_cal:.4f})")
    print(f"  ROI Proxy > 64%         : {'PASS' if kpi_roi else 'FAIL'}  ({roi['accuracy']:.4f}  n={roi['n_games']})")
    print(f"  Trigger rate <= 40%     : {'PASS' if kpi_trig else 'FAIL'}  ({trigger_rate:.1%})")
    print(f"  Beat Vegas              : {'PASS' if kpi_veg else 'FAIL'}  ({acc_dec:.4f} vs {acc_vegas:.4f})")
    print(f"  Upset labels detected   : {'PASS' if kpi_up else 'FAIL'}  ({up_prec['n']} games labeled UPSET)")

    # ── A. Model Comparison ────────────────────────────────────
    print("\n-- A. MODEL COMPARISON --")
    print(f"  {'Model':<28} {'Accuracy':>8} {'Brier':>8} {'ECE':>8}")
    print(f"  {'-'*28} {'-'*8} {'-'*8} {'-'*8}")
    order = ["Random Baseline","Elo Rating Model","Vegas Odds Proxy",
             "MoSport v2.3 (base)","MoSport v3.2 (cal)","MoSport v3.2 (dec)"]
    v31_printed = False
    for name in order:
        if name == "MoSport v3.2 (cal)" and not v31_printed:
            print(f"  {'MoSport v3.1 (ref)   ':<28} {'0.6125':>8} {'0.2311':>8} {'0.0147':>8}  [ref]")
            v31_printed = True
        r = results[name]
        tag = " <--" if "v3.2" in name else ""
        print(f"  {name:<28} {r['accuracy']:>8.4f} {r['brier']:>8.4f} {r['ece']:>8.4f}{tag}")

    # ── B. Decision Score vs Calibrated Prob ──────────────────
    print("\n-- B. CALIBRATED PROB vs DECISION SCORE --")
    print(f"  calibrated_prob acc : {acc_cal:.4f}  ECE: {ece_cal:.4f}")
    print(f"  decision_score  acc : {acc_dec:.4f}  ECE: {results['MoSport v3.2 (dec)']['ece']:.4f}")
    print(f"  Decision score adds : {acc_dec - acc_cal:+.4f} accuracy  "
          f"(signal contribution)")

    # ── C. Calibration Bins ────────────────────────────────────
    print(f"\n-- C. CALIBRATION (calibrated_prob, ECE={ece_cal:.4f}) --")
    for line in cal_display(calibrated_probs, y_test):
        print(line)

    # ── D. Decision Distribution ───────────────────────────────
    print("\n-- D. DECISION DISTRIBUTION --")
    for lbl in ["STRONG","WEAK","CHAOS","UPSET"]:
        n   = dec_dist["counts"][lbl]
        pct = dec_dist["pcts"][lbl]
        bar = "#" * int(pct * 40)
        print(f"  {lbl:<8} {n:5d} games  ({pct:.1%})  {bar}")

    # ── E. Upset Branch Model ──────────────────────────────────
    print("\n-- E. UPSET BRANCH MODEL --")
    print(f"  Train upset candidates : {n_upset_train:,}")
    print(f"  Test upset candidates  : {n_upset_test:,}")
    print(f"  UPSET label issued     : {up_prec['n']:,} games")
    print(f"  Upset precision        : {up_prec['precision']:.4f}  "
          f"(fraction of UPSET games that were actual upsets)")
    print(f"  Recall note            : Coverage handled by upset_candidate "
          f"pool size ({n_upset_test} games)")

    # ── F. ROI Proxy ───────────────────────────────────────────
    print("\n-- F. ROI PROXY (Top 10% by |decision_score - 0.5|) --")
    print(f"  Games  : {roi['n_games']}")
    print(f"  Accuracy : {roi['accuracy']:.4f}")
    pnl_sim = roi["accuracy"] * 100 - (1 - roi["accuracy"]) * 110
    print(f"  Simulated P&L (100 bet, -110 line) : {pnl_sim:+.1f} units per 100 bets")

    # ── G. Upset Stats by Model ────────────────────────────────
    print("\n-- G. UPSET DETECTION (p < 0.40 mask) --")
    print(f"  {'Model':<16} {'#Upsets':>8} {'Rate':>8} {'Coverage':>10}")
    print(f"  {'-'*16} {'-'*8} {'-'*8} {'-'*10}")
    for name, s in upset_by_model.items():
        print(f"  {name:<16} {s['n']:>8} {s['rate']:>8.4f} {s['coverage']:>10.4f}")

    # ── H. Trigger Analysis ────────────────────────────────────
    print(f"\n-- H. TRIGGER ANALYSIS (gate for sim signal) --")
    print(f"  Rate: {trigger_rate:.1%}  ({int(trigger_rate*len(y_test))} / {len(y_test)} games)")
    print(f"  Condition breakdown:")
    for cond, cnt in sorted(trigger_reasons_all.items(), key=lambda x:-x[1]):
        print(f"    {cond:<32} {cnt:5d} games")

    # ── I. Signal Stats ────────────────────────────────────────
    print(f"\n-- I. SIMULATION SIGNAL STATS --")
    print(f"  Signal mean : {sim_signals.mean():+.4f}  std: {sim_signals.std():.4f}")
    print(f"  Chaos index : {chaos_indices.mean():.4f} mean  "
          f"(>={CHAOS_THR:.2f} = CHAOS label)")
    print(f"  MC event avg fire rates:")
    for ev, rate in avg_fire_rates.items():
        bar = "#" * int(rate * 30)
        print(f"    {ev:<18} {rate:.3f}  {bar}")

    # ── J. Statistical Significance ───────────────────────────
    print(f"\n-- J. STATISTICAL SIGNIFICANCE --")
    for lbl, s in [("v3.2 dec vs v2.3 base", sig_vs_v23),
                   ("v3.2 dec vs Vegas",      sig_vs_vegas)]:
        sig_tag = "YES" if s["significant"] else "NO"
        print(f"  {lbl:<30} Brier delta={s['brier_delta']:+.5f}  "
              f"p={s['p_value']:.4f}  sig={sig_tag}")

    # ── K. Architecture Summary ────────────────────────────────
    print(f"\n-- K. ARCHITECTURE SUMMARY --")
    print(f"  LOCKED calibrated_prob  : isotonic on base OOF (no simulation noise)")
    print(f"  Simulation signal       : [-1,+1] directional MC (ALPHA={ALPHA_DECISION})")
    print(f"  Decision score          : calibrated_prob + ALPHA * signal (when triggered)")
    print(f"  Upset branch model      : GBM on CMI/Miracle/Matchup features")
    print(f"  Output per game         : calibrated_prob + decision_score + label")

    # ── Conclusion ─────────────────────────────────────────────
    print(f"\n-- CONCLUSION --")
    print(f"  v2.3 base : {acc_v23:.4f} acc")
    print(f"  v3.2 dec  : {acc_dec:.4f} acc  (delta {acc_dec - acc_v23:+.4f})")
    print(f"  Beat Vegas: {'YES' if kpi_veg else 'NO'}")
    print(f"")
    print(f"  v3.2 separates the prediction layer from the decision layer.")
    print(f"  calibrated_prob is frozen post-isotonic (clean ECE).")
    print(f"  decision_score is the product -- it tells you WHEN to act,")
    print(f"  not what the win probability is.")
    print(f"  UPSET label = high-value underdog opportunity signal.")
    print(f"  STRONG label = recommended action with clear edge.")
    print(f"  CHAOS label = avoid or hedge (high variance).")
    print(f"  WEAK label = no edge, skip.")

    print(f"\n{sep}")
    print(f"  [END REPORT]")
    print(f"{sep}\n")


# ─────────────────────────────────────────────────────────────
# SECTION 13: ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")

    (report_dict, results, dec_dist, up_prec, roi,
     upset_by_model, calibrated_probs, decision_scores,
     base_probs_test, y_test, labels, chaos_indices,
     trigger_rate, trigger_reasons_all, avg_fire_rates,
     sig_vs_v23, sig_vs_vegas,
     n_upset_train, n_upset_test) = run_backtest_v32()

    # Need sim_signals for report (reassign from report_dict)
    sim_signals = np.zeros(len(y_test))  # computed inline above; expose via decision delta
    sim_signals = decision_scores - calibrated_probs

    print_report(
        results, dec_dist, up_prec, roi, upset_by_model,
        calibrated_probs, decision_scores, base_probs_test,
        y_test, labels, chaos_indices,
        trigger_rate, trigger_reasons_all, avg_fire_rates,
        sig_vs_v23, sig_vs_vegas,
        n_upset_train, n_upset_test,
    )

    # Save JSON report
    out_path = "mlb_backtest_v3_2_report.json"
    report_dict["kpis"] = {
        "accuracy_pass":    bool(results["MoSport v3.2 (dec)"]["accuracy"] > 0.6104),
        "ece_pass":         bool(results["MoSport v3.2 (cal)"]["ece"] < 0.010),
        "roi_proxy_pass":   bool(roi["accuracy"] > 0.64),
        "trigger_rate_pass":bool(trigger_rate <= 0.40),
        "beat_vegas_pass":  bool(results["MoSport v3.2 (dec)"]["accuracy"] >
                                  results["Vegas Odds Proxy"]["accuracy"]),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report_dict, f, indent=2, default=str)
    print(f"[SAVED] {out_path}")
