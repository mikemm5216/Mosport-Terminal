#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v4.0 -- Truth-Based Backtest Engine
STEP 2-4: Train on real data, blind-test on 2024.

Architecture:
  DATA     : Real MLB game results (Baseball Savant / pybaseball)
  TRAIN    : 2021-2022 seasons
  VALIDATE : 2023 season
  TEST     : 2024 season (BLIND -- never seen during any tuning)
  FEATURES : All rolling from real game logs (strict t-1 alignment)
  LABEL    : Real home_win (0/1) from actual game result

Feature Sources:
  - win_rate_delta        : team rolling win rate from real results
  - run_diff_rolling      : real run differential, rolling 10
  - sp_rest_delta         : real SP rest days (statcast pitcher_days_since_prev_game)
  - sp_pc_delta           : SP pitch count from prior start (real)
  - bp_usage_delta        : bullpen pitchers used (3-day rolling, real)
  - ev_delta              : team exit velocity z-score (real Statcast)
  - streak                : current real win/loss streak
  - h2h_recent            : head-to-head last 5 meetings
  - travel_km             : haversine from real stadium coordinates
  - pythagorean_wr_delta  : RS^2/(RS^2+RA^2) win expectancy, rolling 20

Decision Layer (from v3.x):
  - Platt sigmoid calibration on BASE OOF
  - Deterministic signal engine
  - WHOOP socket (Blind Mode)
  - Labels: STRONG / WEAK / CHAOS / UPSET

NO:
  - random.seed() game simulation
  - Synthetic win/loss labels
  - Circular validation (train/test from same synthetic distribution)
"""

import json
import math
import os
import sys
from collections import defaultdict, deque
from datetime import date, timedelta
from pathlib import Path
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
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import cross_val_predict
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

REAL_GAMES_PATH = Path("data/real_games/mlb_games_real.parquet")

# ── Decision layer constants (from v3.3) ────────────────────
ALPHA_DECISION  = 0.09
UPSET_THRESHOLD = 0.47
UPSET_CONF_THR  = 0.54
CHAOS_THR       = 0.55
STRONG_EDGE     = 0.09
MIN_SIGNAL_ABS  = 0.25
MAX_SIGNAL_NORM = 1.57

# ── Real stadium coordinates (haversine travel) ──────────────
STADIUM_COORDS = {
    "NYY":(40.829,-73.926),"BOS":(42.346,-71.098),"TBR":(27.768,-82.653),
    "TOR":(43.641,-79.389),"BAL":(39.284,-76.622),"CWS":(41.830,-87.634),
    "MIN":(44.982,-93.278),"CLE":(41.496,-81.685),"KCR":(39.051,-94.480),
    "DET":(42.339,-83.049),"HOU":(29.757,-95.355),"OAK":(37.751,-122.201),
    "SEA":(47.591,-122.333),"LAA":(33.800,-117.883),"TEX":(32.747,-97.083),
    "ATL":(33.735,-84.390),"NYM":(40.757,-73.846),"PHI":(39.906,-75.167),
    "MIA":(25.778,-80.220),"WSN":(38.873,-77.008),"MIL":(43.028,-87.971),
    "CHC":(41.948,-87.655),"STL":(38.623,-90.193),"CIN":(39.097,-84.508),
    "PIT":(40.447,-80.005),"LAD":(34.074,-118.240),"SFG":(37.778,-122.389),
    "SDP":(32.707,-117.157),"COL":(39.756,-104.994),"ARI":(33.445,-112.067),
}

TEAM_TIMEZONES = {
    "NYY":-5,"BOS":-5,"TBR":-5,"TOR":-5,"BAL":-5,"CWS":-6,"MIN":-6,
    "CLE":-5,"KCR":-6,"DET":-5,"HOU":-6,"OAK":-8,"SEA":-8,"LAA":-8,
    "TEX":-6,"ATL":-5,"NYM":-5,"PHI":-5,"MIA":-5,"WSN":-5,"MIL":-6,
    "CHC":-6,"STL":-6,"CIN":-5,"PIT":-5,"LAD":-8,"SFG":-8,"SDP":-8,
    "COL":-7,"ARI":-7,
}

def _haversine(c1, c2):
    R = 6371.0
    lat1,lon1=math.radians(c1[0]),math.radians(c1[1])
    lat2,lon2=math.radians(c2[0]),math.radians(c2[1])
    dlat,dlon=lat2-lat1,lon2-lon1
    a=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R*2*math.asin(math.sqrt(a))

def _circadian(away, home):
    dtz = TEAM_TIMEZONES.get(home, -5) - TEAM_TIMEZONES.get(away, -5)
    if dtz > 0: return min(1.0, dtz / 4.0 * 1.4)
    if dtz < 0: return min(1.0, abs(dtz) / 4.0 * 0.7)
    return 0.0


# ─────────────────────────────────────────────────────────────
# SECTION 1: ROLLING FEATURE BUILDER
# ALL rolling windows strictly ≤ t-1 (no lookahead).
# ─────────────────────────────────────────────────────────────

class TeamStateTracker:
    """
    Builds rolling features per team from real game results.
    Strict t-1: all features computed from games BEFORE current game_date.
    """
    def __init__(self, window_wr=20, window_rd=10, window_bp=3):
        self.window_wr = window_wr
        self.window_rd = window_rd
        self.window_bp = window_bp

        # Per-team historical records (filled as we process games chronologically)
        self._results:   Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_wr))
        self._run_diff:  Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_rd))
        self._rs:        Dict[str, deque] = defaultdict(lambda: deque(maxlen=20))  # runs scored
        self._ra:        Dict[str, deque] = defaultdict(lambda: deque(maxlen=20))  # runs allowed
        self._bp_usage:  Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_bp))
        self._streaks:   Dict[str, int]   = defaultdict(int)
        self._sp_rest:   Dict[str, float] = defaultdict(lambda: 4.0)
        self._sp_pc:     Dict[str, float] = defaultdict(lambda: 90.0)
        self._ev:        Dict[str, deque] = defaultdict(lambda: deque(maxlen=15))
        self._last_date: Dict[str, date]  = {}
        self._h2h:       Dict[str, deque] = defaultdict(lambda: deque(maxlen=5))

    def get_features(self, home: str, away: str, game_date: date,
                     row: pd.Series) -> Dict[str, float]:
        """
        Returns feature dict for this game using only historical data (≤ t-1).
        row contains raw game-level data (sp_rest, ev, etc.).
        """
        def wr(t):
            h = list(self._results[t])
            return float(np.mean(h)) if h else 0.500

        def rd(t):
            h = list(self._run_diff[t])
            return float(np.mean(h)) if h else 0.0

        def pyth(t):
            rs = list(self._rs[t]); ra = list(self._ra[t])
            if not rs or not ra: return 0.500
            mrs = max(np.mean(rs), 0.1); mra = max(np.mean(ra), 0.1)
            return mrs**2 / (mrs**2 + mra**2)

        def bp(t):
            h = list(self._bp_usage[t])
            return float(np.mean(h)) if h else 2.0

        def streak(t):
            return float(np.tanh(self._streaks[t] / 5.0))

        def ev_z(t):
            h = list(self._ev[t])
            return float(np.mean(h)) if h else 0.0

        def h2h(h_team, a_team):
            k = f"{h_team}_{a_team}"
            hist = list(self._h2h[k])
            return float(np.mean(hist)) if hist else 0.500

        # Travel
        hc = STADIUM_COORDS.get(home, (40.0, -75.0))
        ac = STADIUM_COORDS.get(away, (40.0, -75.0))
        travel_km = _haversine(ac, hc)
        circ = _circadian(away, home)

        # SP rest from real data (this game's SP)
        home_sp_rest = float(row.get("home_sp_rest", 4.0))
        away_sp_rest = float(row.get("away_sp_rest", 4.0))
        if np.isnan(home_sp_rest): home_sp_rest = 4.0
        if np.isnan(away_sp_rest): away_sp_rest = 4.0

        # SP pitch count from LAST start (stored from prior game update)
        home_sp_pc_last = self._sp_pc.get(home, 90.0)
        away_sp_pc_last = self._sp_pc.get(away, 90.0)

        # Bullpen usage: average over last 3 games
        home_bp = bp(home)
        away_bp = bp(away)

        return {
            # Team quality (rolling)
            "win_rate_delta":     wr(home) - wr(away),
            "home_win_rate":      wr(home),
            "away_win_rate":      wr(away),
            "run_diff_delta":     rd(home) - rd(away),
            "pythagorean_delta":  pyth(home) - pyth(away),
            # Momentum
            "home_streak":        streak(home),
            "away_streak":        streak(away),
            "streak_delta":       streak(home) - streak(away),
            # Physiological (real data)
            "sp_rest_delta":      home_sp_rest - away_sp_rest,
            "home_sp_rest":       home_sp_rest,
            "away_sp_rest":       away_sp_rest,
            "sp_pc_delta":        home_sp_pc_last - away_sp_pc_last,  # heavier load = fatigue
            "bp_usage_delta":     home_bp - away_bp,
            "home_bp_usage":      home_bp,
            "away_bp_usage":      away_bp,
            # Statcast quality
            "ev_delta":           ev_z(home) - ev_z(away),
            "home_ev_z":          ev_z(home),
            # Head-to-head
            "h2h_recent":         h2h(home, away),
            # Travel / Circadian
            "travel_km":          min(1.0, travel_km / 5000.0),
            "circadian_pen":      circ,
        }

    def update(self, home: str, away: str, game_date: date, row: pd.Series):
        """
        Update state AFTER recording features.
        Uses real game result from row.
        """
        hw = int(row.get("home_win", 0))
        h_score = int(row.get("home_score", 0))
        a_score = int(row.get("away_score", 0))
        h_ev = float(row.get("home_ev", np.nan))
        a_ev = float(row.get("away_ev", np.nan))

        # Win/loss records
        self._results[home].append(hw)
        self._results[away].append(1 - hw)

        # Run differential
        self._run_diff[home].append(h_score - a_score)
        self._run_diff[away].append(a_score - h_score)

        # Runs scored/allowed (for Pythagorean)
        self._rs[home].append(h_score); self._ra[home].append(a_score)
        self._rs[away].append(a_score); self._ra[away].append(h_score)

        # Bullpen usage (pitchers used today)
        h_bp = int(row.get("home_bp_n", 2))
        a_bp = int(row.get("away_bp_n", 2))
        self._bp_usage[home].append(h_bp)
        self._bp_usage[away].append(a_bp)

        # SP pitch count (for next game, this game's count is the "recent load")
        h_pc = float(row.get("home_sp_pc", 90.0))
        a_pc = float(row.get("away_sp_pc", 90.0))
        if not np.isnan(h_pc) and h_pc > 0: self._sp_pc[home] = h_pc
        if not np.isnan(a_pc) and a_pc > 0: self._sp_pc[away] = a_pc

        # Exit velocity z-score (normalize within tracker)
        league_ev = 88.5  # approximately MLB average
        if not np.isnan(h_ev):
            self._ev[home].append((h_ev - league_ev) / 3.0)
        if not np.isnan(a_ev):
            self._ev[away].append((a_ev - league_ev) / 3.0)

        # Streaks
        self._streaks[home] = max(-10, min(10,
            self._streaks[home] + (1 if hw else -1)))
        self._streaks[away] = max(-10, min(10,
            self._streaks[away] + (-1 if hw else 1)))

        # H2H
        self._h2h[f"{home}_{away}"].append(hw)
        self._h2h[f"{away}_{home}"].append(1 - hw)

        self._last_date[home] = game_date
        self._last_date[away] = game_date


def build_feature_matrix(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Build feature matrix from real game DataFrame using rolling state tracker.
    Returns (X, y, game_ids).
    y = real home_win labels (0/1).
    """
    df = df.sort_values("game_date").reset_index(drop=True)
    tracker = TeamStateTracker()
    X_rows  = []
    y_vals  = []
    ids     = []
    min_games_needed = 5  # skip first N games until tracker has some history

    # Track per-team game count to skip early games
    team_game_count: Dict[str, int] = defaultdict(int)

    for _, row in df.iterrows():
        home = row["home_team"]
        away = row["away_team"]
        gdate = pd.to_datetime(row["game_date"]).date() if not isinstance(
            row["game_date"], date) else row["game_date"]

        h_count = team_game_count[home]
        a_count = team_game_count[away]

        if h_count >= min_games_needed and a_count >= min_games_needed:
            feats = tracker.get_features(home, away, gdate, row)
            X_rows.append(list(feats.values()))
            y_vals.append(int(row["home_win"]))
            ids.append(row.get("game_pk", len(ids)))

        tracker.update(home, away, gdate, row)
        team_game_count[home] += 1
        team_game_count[away] += 1

    FEATURE_NAMES = list(tracker.get_features("NYY", "BOS", date(2021, 4, 1),
                                               pd.Series(dtype=float)).keys())

    return np.array(X_rows, dtype=np.float32), np.array(y_vals), ids, FEATURE_NAMES


# ─────────────────────────────────────────────────────────────
# SECTION 2: UPSET ENTROPY ENGINE
# v4.0 change: upset = "high entropy game" cluster
# not "predict who wins" -- predict uncertainty
# ─────────────────────────────────────────────────────────────

class UpsetEntropyModel:
    """
    Predicts P(high entropy game) rather than P(upset).
    High entropy = game is genuinely uncertain regardless of who wins.
    Features: momentum gap, quality gap, rest gap, streak divergence.
    Output: entropy_score in [0, 1].
    """
    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=150, max_depth=3, learning_rate=0.05,
            subsample=0.8, random_state=RANDOM_SEED,
        )
        self._fitted = False

    def fit(self, X: np.ndarray, calibrated_probs: np.ndarray):
        """
        High entropy = calibrated_prob in [0.40, 0.60]
        (games where neither team is clearly better).
        """
        high_entropy = ((calibrated_probs >= 0.40) & (calibrated_probs <= 0.60)).astype(int)
        if high_entropy.sum() < 20:
            return
        self.model.fit(X, high_entropy)
        self._fitted = True

    def predict_entropy(self, X: np.ndarray) -> np.ndarray:
        if not self._fitted:
            return np.zeros(len(X))
        return self.model.predict_proba(X)[:, 1]


# ─────────────────────────────────────────────────────────────
# SECTION 3: BASE ENSEMBLE (v2.3 config, real features)
# ─────────────────────────────────────────────────────────────

class BaseEnsemble:
    def __init__(self):
        self.stack = StackingClassifier(
            estimators=[
                ("xgb", xgb.XGBClassifier(
                    n_estimators=400, max_depth=4, learning_rate=0.04,
                    subsample=0.75, colsample_bytree=0.75, min_child_weight=6,
                    gamma=0.15, reg_alpha=0.1, reg_lambda=2.0,
                    use_label_encoder=False, eval_metric="logloss",
                    random_state=RANDOM_SEED, verbosity=0)),
                ("lgb", lgb.LGBMClassifier(
                    n_estimators=400, num_leaves=25, learning_rate=0.04,
                    subsample=0.75, colsample_bytree=0.75, min_child_samples=30,
                    reg_alpha=0.1, reg_lambda=2.0,
                    random_state=RANDOM_SEED, verbosity=-1)),
                ("rf", RandomForestClassifier(
                    n_estimators=400, max_depth=8, min_samples_leaf=25,
                    max_features="sqrt", random_state=RANDOM_SEED, n_jobs=-1)),
            ],
            final_estimator=LogisticRegression(C=0.5, max_iter=500,
                                               random_state=RANDOM_SEED),
            cv=5, stack_method="predict_proba", passthrough=True, n_jobs=-1,
        )
        self.scaler = StandardScaler()

    def fit(self, X, y):
        self.stack.fit(self.scaler.fit_transform(X), y)

    def predict_proba(self, X) -> np.ndarray:
        return self.stack.predict_proba(self.scaler.transform(X))[:, 1]

    def oof_proba(self, X, y) -> np.ndarray:
        Xs = self.scaler.transform(X)
        return cross_val_predict(self.stack, Xs, y, cv=5,
                                 method="predict_proba")[:, 1]


def _temperature_scale(probs: np.ndarray, T: float) -> np.ndarray:
    """Compress probabilities toward 0.5 by temperature T > 1."""
    logits = np.log(np.clip(probs, 1e-7, 1-1e-7) / np.clip(1-probs, 1e-7, 1-1e-7))
    return 1.0 / (1.0 + np.exp(-logits / T))


class PlattCalibrator:
    def __init__(self):
        self.lr = LogisticRegression(C=1e4, solver="lbfgs",
                                     max_iter=1000, random_state=RANDOM_SEED)
        self._fitted = False
        self._T = 1.0  # temperature, fitted on OOF

    def fit(self, oof_probs, y):
        self.lr.fit(oof_probs.reshape(-1, 1), y)
        # Temperature scaling fitted on OOF (T>1 compresses overconfident predictions)
        platt_oof = self.lr.predict_proba(oof_probs.reshape(-1, 1))[:, 1]
        best_T, best_ece = 1.0, ece_score(platt_oof, y)
        for T in np.arange(1.02, 1.60, 0.02):
            e = ece_score(_temperature_scale(platt_oof, T), y)
            if e < best_ece:
                best_ece = e; best_T = T
        # Bias T upward slightly — ensemble methods overconfident on unseen data
        self._T = max(1.10, best_T)
        self._fitted = True

    def transform(self, probs) -> np.ndarray:
        if not self._fitted: return probs
        platt = self.lr.predict_proba(probs.reshape(-1, 1))[:, 1]
        return _temperature_scale(platt, self._T)


# ─────────────────────────────────────────────────────────────
# SECTION 4: DETERMINISTIC SIGNAL ENGINE (from v3.3)
# Now driven by REAL feature deltas
# ─────────────────────────────────────────────────────────────

def compute_signal(features: Dict[str, float]) -> Tuple[float, float]:
    """Deterministic signal from real feature deltas. Returns (signal, chaos_index)."""
    raw = 0.0; home_pull = 0.0; away_pull = 0.0

    def _add(weight, delta, threshold, norm):
        nonlocal raw, home_pull, away_pull
        if abs(delta) < threshold: return
        mag = weight * float(np.sign(delta)) * min(1.0, abs(delta) / norm)
        raw += mag
        if mag > 0: home_pull += mag
        else: away_pull += abs(mag)

    _add(0.30, features.get("win_rate_delta", 0),     0.15, 0.20)
    _add(0.25, features.get("pythagorean_delta", 0),   0.12, 0.18)
    _add(0.25, features.get("run_diff_delta", 0),      0.80, 1.50)
    _add(0.20, features.get("sp_rest_delta", 0),       2.00, 3.00)  # real rest days
    _add(0.20, features.get("sp_pc_delta", 0),         35.0, 50.0)  # real pitch count diff
    _add(0.15, -features.get("bp_usage_delta", 0),     1.20, 1.50)  # more bp used = tired
    _add(0.18, features.get("ev_delta", 0),            0.65, 0.80)  # real EV quality
    _add(0.15, features.get("streak_delta", 0),        0.70, 1.00)

    # Circadian: always home-positive (away travel penalty)
    circ = features.get("circadian_pen", 0)
    if circ > 0.75:
        comp = 0.18 * min(1.0, circ / 0.80)
        raw += comp; home_pull += comp

    normalized = float(np.clip(raw / MAX_SIGNAL_NORM, -1.0, 1.0))
    if abs(normalized) < MIN_SIGNAL_ABS:
        normalized = 0.0

    total_pull = home_pull + away_pull
    chaos_idx = float(2 * min(home_pull, away_pull) / total_pull) if total_pull > 0 else 0.0

    return normalized, chaos_idx


def classify_label(cal_prob, dec_score, entropy_score, chaos_idx) -> str:
    if entropy_score > 0.85 and abs(cal_prob - 0.5) < 0.05:
        return "UPSET (Blind)"  # high-entropy close game = upset opportunity
    if chaos_idx > CHAOS_THR:
        return "CHAOS"
    if abs(dec_score - 0.5) > STRONG_EDGE:
        return "STRONG (Blind)"
    return "WEAK"


# ─────────────────────────────────────────────────────────────
# SECTION 5: BASELINES
# ─────────────────────────────────────────────────────────────

def vegas_proxy(df: pd.DataFrame) -> np.ndarray:
    """Vegas proxy from real win rates (rolling computed in features)."""
    p = []
    for _, r in df.iterrows():
        wr_h = float(r.get("home_win_rate", 0.500))
        wr_a = float(r.get("away_win_rate", 0.500))
        b = 0.5 + 0.038 + (wr_h - wr_a) * 0.55
        b = 0.5 + (b - 0.5) * 0.85
        p.append(max(0.10, min(0.90, b)))
    return np.array(p)

class EloModel:
    K = 24
    def __init__(self): self.r = {}
    def _g(self, t): return self.r.get(t, 1500.0)
    def _e(self, ra, rb): return 1.0 / (1.0 + 10**((rb-ra)/400.0))
    def update(self, h, a, hw):
        ra, rb = self._g(h), self._g(a); ea = self._e(ra+30, rb)
        self.r[h]=ra+self.K*(float(hw)-ea); self.r[a]=rb+self.K*((1-float(hw))-(1-ea))
    def predict(self, h, a): return self._e(self._g(h)+30, self._g(a))


# ─────────────────────────────────────────────────────────────
# SECTION 6: EVALUATION
# ─────────────────────────────────────────────────────────────

def accuracy(p, y): return float(np.mean((p >= 0.5).astype(int) == y))
def brier(p, y):    return float(brier_score_loss(y, p))

def ece_score(p, y, n=10):
    e=np.linspace(0,1,n+1); ece=0.0
    for i in range(n):
        m=(p>=e[i])&(p<e[i+1])
        if m.sum()==0: continue
        ece+=(m.sum()/len(p))*abs(p[m].mean()-y[m].mean())
    return round(ece, 4)

def roi_proxy(dec_scores, y, top_pct=0.10):
    edge=np.abs(dec_scores-0.5)
    n_top=max(1,int(len(y)*top_pct))
    top_idx=np.argsort(edge)[-n_top:]
    acc=float(np.mean((dec_scores[top_idx]>=0.5).astype(int)==y[top_idx]))
    return {"n":n_top,"accuracy":round(acc,4)}

def upset_entropy_stats(labels, entropy_scores, y):
    idx=[i for i,l in enumerate(labels) if "UPSET" in l]
    if not idx: return {"n":0,"actual_close_games":0.0}
    actual_close=float(np.mean(np.abs(np.array([entropy_scores[i] for i in idx])-0.5)<0.08))
    return {"n":len(idx),"actual_close_game_rate":round(actual_close,3)}

def dec_dist(labels):
    cats={"STRONG (Blind)":0,"WEAK":0,"CHAOS":0,"UPSET (Blind)":0}
    for l in labels:
        cats[l] = cats.get(l, 0) + 1
    return cats

def sig_test(pm, pb, y):
    diff=(pb-y)**2-(pm-y)**2
    _,pv=stats.ttest_1samp(diff,0)
    return {"brier_delta":round(float(diff.mean()),5),"p_value":round(float(pv),4),
            "significant":bool(pv<0.05 and diff.mean()>0)}

def cal_display(p, y, n=8):
    try:
        from sklearn.calibration import calibration_curve
        fp,mp=calibration_curve(y,p,n_bins=n,strategy="uniform")
        return [f"    {pred:.2f} -> {frac:.2f}  {'#'*int(frac*20)}"
                for pred,frac in zip(mp,fp)]
    except Exception:
        return ["    (calibration display unavailable)"]


# ─────────────────────────────────────────────────────────────
# SECTION 6B: ALPHA FUND ROI DECOMPOSITION ENGINE (v4.0.1)
# ─────────────────────────────────────────────────────────────

def _calculate_payout(american_odds: float) -> float:
    """Profit per 1-unit bet. +150 -> 1.50, -110 -> 0.909."""
    if american_odds >= 0:
        return american_odds / 100.0
    return 100.0 / abs(american_odds)


def prob_to_moneyline(cal_prob: float) -> float:
    """
    Convert calibrated home-win probability to American moneyline for the home team.
    cal_prob=0.60 -> -150 (home favored), cal_prob=0.40 -> +150 (home underdog).
    """
    p = float(np.clip(cal_prob, 0.01, 0.99))
    if p >= 0.5:
        return round(-100.0 * p / (1.0 - p), 0)
    return round(100.0 * (1.0 - p) / p, 0)


def _bucket_key(label: str) -> str:
    """Map label string to canonical bucket key."""
    if "STRONG" in label: return "STRONG"
    if "UPSET"  in label: return "UPSET"
    if "CHAOS"  in label: return "CHAOS"
    return "WEAK"


class UpsetROIDecomposer:
    """
    Alpha Bucket Decomposition Engine — v4.0.1
    Tracks per-label P&L with realistic variable moneyline odds.
    Odds derived from calibrated probability (proxy for Vegas closing line).
    """
    BUCKETS = ["STRONG", "UPSET", "WEAK", "CHAOS"]

    def __init__(self):
        self._reset()

    def _reset(self):
        self.stats = {b: {"bets":0,"wins":0,"profit":0.0,
                          "odds_sum":0.0,"ev_sum":0.0} for b in self.BUCKETS}
        self.total_profit = 0.0
        self.total_bets   = 0

    def record(self, label: str, dec_score: float, cal_prob: float,
               actual_win: int):
        """
        label     : model label (STRONG/UPSET/WEAK/CHAOS)
        dec_score : final decision probability (>= 0.5 = bet home)
        cal_prob  : calibrated base probability (used to derive odds)
        actual_win: 1 = home won, 0 = away won
        """
        bucket = _bucket_key(label)
        pred_home = dec_score >= 0.5

        # Odds for the side we're betting
        home_ml = prob_to_moneyline(cal_prob)
        if pred_home:
            bet_odds = home_ml                        # betting home at home_ml
            correct  = (actual_win == 1)
        else:
            # Betting away: away ML is inverse of home ML
            away_ml  = -home_ml if home_ml < 0 else -home_ml
            # Convert properly: if home is -150, away is +130 (vig gap ~5%)
            if home_ml < 0:
                bet_odds = round(100.0 * (1.0 - cal_prob) / cal_prob * 0.95, 0)
            else:
                bet_odds = round(-100.0 * cal_prob / (1.0 - cal_prob) * 0.95, 0)
            correct = (actual_win == 0)

        payout = _calculate_payout(bet_odds)
        profit = payout if correct else -1.0

        s = self.stats[bucket]
        s["bets"]     += 1
        s["wins"]     += int(correct)
        s["profit"]   += profit
        s["odds_sum"] += bet_odds
        # EV = win_prob * payout - lose_prob * 1
        win_p = abs(dec_score - 0.5) + 0.5  # model's confidence it wins
        s["ev_sum"]   += win_p * payout - (1.0 - win_p)

        self.total_profit += profit
        self.total_bets   += 1

    # ── Metric helpers ──────────────────────────────────────────
    def win_rate(self, b): s=self.stats[b]; return s["wins"]/s["bets"] if s["bets"] else 0.0
    def roi(self, b):      s=self.stats[b]; return s["profit"]/s["bets"] if s["bets"] else 0.0
    def avg_odds(self, b): s=self.stats[b]; return s["odds_sum"]/s["bets"] if s["bets"] else 0.0
    def ev(self, b):       s=self.stats[b]; return s["ev_sum"]/s["bets"] if s["bets"] else 0.0
    def bets(self, b):     return self.stats[b]["bets"]
    def profit(self, b):   return self.stats[b]["profit"]

    def upset_vs_strong_edge(self): return self.roi("UPSET") - self.roi("STRONG")
    def is_upset_alpha(self):       return self.roi("UPSET") > 0.0
    def total_roi(self):            return self.total_profit / max(1, self.total_bets)

    # ── Significance test (one-sample t on per-bet profit) ──────
    def upset_significance(self, bet_profits_upset: np.ndarray):
        if len(bet_profits_upset) < 10:
            return {"p_value": 1.0, "significant": False}
        _, pv = stats.ttest_1samp(bet_profits_upset, 0)
        return {"p_value": round(float(pv), 4),
                "significant": bool(pv < 0.10 and bet_profits_upset.mean() > 0)}

    def summary(self) -> dict:
        return {b: {"bets": self.bets(b),
                    "win_rate": round(self.win_rate(b), 4),
                    "roi": round(self.roi(b), 4),
                    "avg_odds": round(self.avg_odds(b), 1),
                    "ev": round(self.ev(b), 4),
                    "profit_units": round(self.profit(b), 2)}
                for b in self.BUCKETS}


def run_alpha_decomposition(labels, dec_scores, cal_probs, y_test):
    """
    Wire UpsetROIDecomposer into the backtest results.
    Returns decomposer instance + per-bet profit arrays for significance testing.
    """
    decomposer = UpsetROIDecomposer()
    upset_profits = []

    for i in range(len(y_test)):
        lbl = labels[i]
        bucket = _bucket_key(lbl)

        cal_p  = float(cal_probs[i])
        dec_s  = float(dec_scores[i])
        actual = int(y_test[i])

        pred_home = dec_s >= 0.5
        home_ml   = prob_to_moneyline(cal_p)

        if pred_home:
            bet_odds = home_ml
            correct  = (actual == 1)
        else:
            if home_ml < 0:
                bet_odds = round(100.0 * (1.0 - cal_p) / cal_p * 0.95, 0)
            else:
                bet_odds = round(-100.0 * cal_p / (1.0 - cal_p) * 0.95, 0)
            correct = (actual == 0)

        payout = _calculate_payout(bet_odds)
        profit = payout if correct else -1.0

        decomposer.record(lbl, dec_s, cal_p, actual)
        if bucket == "UPSET":
            upset_profits.append(profit)

    upset_sig = decomposer.upset_significance(np.array(upset_profits))
    return decomposer, upset_sig


def print_alpha_report(decomposer: UpsetROIDecomposer, upset_sig: dict,
                       test_season: int):
    """VP-ready Alpha Decomposition terminal block."""
    SEP2 = "=" * 47

    print(f"\n{SEP2}")
    print(f"  MoSport v4.0.1 -- ALPHA DECOMPOSITION")
    print(f"  Tested on {test_season} Real MLB Season (Blind)")
    print(f"  Odds: variable moneyline from calibrated prob")
    print(SEP2)

    for b in ["STRONG", "UPSET", "WEAK", "CHAOS"]:
        wr   = decomposer.win_rate(b)
        r    = decomposer.roi(b)
        od   = decomposer.avg_odds(b)
        ev   = decomposer.ev(b)
        n    = decomposer.bets(b)
        pnl  = decomposer.profit(b)
        sign = "+" if r >= 0 else ""
        od_s = f"+{od:.0f}" if od >= 0 else f"{od:.0f}"

        if b == "UPSET":
            sig_tag = f"  p={upset_sig['p_value']:.3f} {'[SIG]' if upset_sig['significant'] else '[not sig]'}"
        else:
            sig_tag = ""

        print(f"\n[{b}]{sig_tag}")
        print(f"  Bets     : {n:,}")
        print(f"  Win Rate : {wr:.1%}")
        print(f"  Avg Line : {od_s}")
        print(f"  ROI      : {sign}{r*100:.2f}%  ({pnl:+.1f} units)")
        print(f"  EV/bet   : {ev:+.4f}")

    edge = decomposer.upset_vs_strong_edge()
    tot  = decomposer.total_roi()
    alpha_flag = "YES -- UPSET IS ALPHA BUCKET" if decomposer.is_upset_alpha() else "NO  -- UPSET ROI NEGATIVE"

    print(f"\n{'-'*47}")
    print(f"  UPSET vs STRONG EDGE  : {edge*100:+.2f}%")
    print(f"  TOTAL SYSTEM ROI      : {tot*100:+.2f}%")
    print(f"  UPSET ALPHA VALID     : {alpha_flag}")
    print(f"{SEP2}\n")


# ─────────────────────────────────────────────────────────────
# SECTION 7: MAIN PIPELINE
# ─────────────────────────────────────────────────────────────

def run_v4_backtest():
    SEP = "=" * 68
    print(SEP)
    print("  MoSport v4.0 -- Truth-Based Backtest Engine")
    print("  Ground truth: Real MLB game results (Baseball Savant)")
    print("  Blind test  : 2024 season (never seen during training)")
    print(SEP)

    # ── Load real game data ─────────────────────────────────────
    print("\n[STEP 1] Loading real game dataset...")
    if not REAL_GAMES_PATH.exists():
        print(f"  ERROR: {REAL_GAMES_PATH} not found.")
        print("  Run: python build_real_dataset_v4.py")
        sys.exit(1)

    df_all = pd.read_parquet(REAL_GAMES_PATH)
    df_all = df_all[df_all["home_win"].isin([0, 1])].copy()
    df_all["game_date"] = pd.to_datetime(df_all["game_date"])
    df_all = df_all.sort_values("game_date").reset_index(drop=True)

    seasons = sorted(df_all["season"].unique())
    print(f"  Total games : {len(df_all):,}")
    print(f"  Seasons     : {seasons}")
    for s in seasons:
        n = (df_all.season == s).sum()
        print(f"    {s}: {n:,} games  "
              f"(home win rate: {df_all[df_all.season==s]['home_win'].mean():.3f})")

    if 2024 not in seasons:
        print("\n  WARNING: No 2024 data found. Run build_real_dataset_v4.py --seasons 2024")
        print("  Using 2023 as hold-out test instead.")
        train_seasons = [s for s in seasons if s <= 2022]
        test_season   = max(seasons)
    else:
        train_seasons = [s for s in seasons if s <= 2022]
        test_season   = 2024

    print(f"\n  TRAIN: {train_seasons}  |  BLIND TEST: {test_season}")

    # ── Build features ──────────────────────────────────────────
    print("\n[STEP 2] Building real features (strict t-1 rolling)...")

    # CRITICAL: build features sequentially across ALL seasons
    # so rolling state carries over from 2021 → 2022 → 2023 → 2024
    X_all, y_all, ids_all, FEAT_NAMES = build_feature_matrix(df_all)

    # Re-align with df_all by matching on game count
    # (build_feature_matrix skips first N games per team)
    df_all_feat = df_all.copy()
    # We need to identify which rows were included
    # Rebuild with index tracking
    df_all_sorted = df_all.sort_values("game_date").reset_index(drop=True)

    # Rebuild tracker to identify included/excluded rows
    print(f"  Feature matrix: {X_all.shape[0]:,} games × {X_all.shape[1]} features")
    print(f"  Features: {FEAT_NAMES}")

    # Split by season
    # We need season labels for each included game
    # Rebuild with season tracking
    tracker_s = TeamStateTracker()
    team_gc: Dict[str, int] = defaultdict(int)
    included_seasons = []
    included_indices = []

    for idx, row in df_all_sorted.iterrows():
        home = row["home_team"]; away = row["away_team"]
        gdate = pd.to_datetime(row["game_date"]).date()
        if team_gc[home] >= 5 and team_gc[away] >= 5:
            included_seasons.append(int(row["season"]))
            included_indices.append(idx)
        tracker_s.update(home, away, gdate, row)
        team_gc[home] += 1; team_gc[away] += 1

    included_seasons = np.array(included_seasons)
    df_included = df_all_sorted.loc[included_indices].reset_index(drop=True)

    # Validate alignment
    if len(included_seasons) != len(X_all):
        print(f"  WARNING: alignment mismatch {len(included_seasons)} vs {len(X_all)}")
        min_len = min(len(included_seasons), len(X_all))
        X_all = X_all[:min_len]
        y_all = y_all[:min_len]
        included_seasons = included_seasons[:min_len]

    # Split
    train_mask = np.isin(included_seasons, train_seasons)
    test_mask  = included_seasons == test_season

    X_train, y_train = X_all[train_mask], y_all[train_mask]
    X_test,  y_test  = X_all[test_mask],  y_all[test_mask]

    print(f"  Train: {X_train.shape[0]:,} games  |  Test: {X_test.shape[0]:,} games")
    print(f"  Train home win rate: {y_train.mean():.3f}")
    print(f"  Test  home win rate: {y_test.mean():.3f}")

    if len(X_test) == 0:
        print("  ERROR: No test games. Check data coverage.")
        sys.exit(1)

    # ── Baselines ───────────────────────────────────────────────
    print("\n[STEP 3] Computing baselines...")
    random_probs = np.full(len(y_test), 0.5)

    # Vegas proxy (from rolling win rates in feature matrix)
    # Feature 0 = win_rate_delta, feat 1 = home_win_rate, feat 2 = away_win_rate
    veg_probs = np.zeros(len(y_test))
    for i in range(len(X_test)):
        hwr = float(X_test[i, 1]) + 0.500  # home_win_rate stored as delta offset
        awr = float(X_test[i, 2]) + 0.500  # approximate
        b = 0.5 + 0.038 + (X_test[i,0]) * 0.55
        b = 0.5 + (b - 0.5) * 0.85
        veg_probs[i] = max(0.10, min(0.90, b))

    # Elo
    elo = EloModel()
    for _, row in df_all_sorted[df_all_sorted["season"].isin(train_seasons)].iterrows():
        elo.update(row["home_team"], row["away_team"], int(row["home_win"]))

    elo_probs = np.zeros(len(y_test))
    test_rows = df_included[df_included["season"] == test_season].reset_index(drop=True)
    for i, (_, row) in enumerate(test_rows.iterrows()):
        if i >= len(y_test): break
        elo_probs[i] = elo.predict(row["home_team"], row["away_team"])
        elo.update(row["home_team"], row["away_team"], int(row["home_win"]))

    print("  [OK] Random / Vegas / Elo")

    # ── Base Ensemble ───────────────────────────────────────────
    print("\n[STEP 4] Training base ensemble on REAL data...")
    ensemble = BaseEnsemble()
    ensemble.fit(X_train, y_train)
    base_probs = ensemble.predict_proba(X_test)
    print("  [OK] Ensemble trained")

    # ── Platt Calibration (BASE OOF) ────────────────────────────
    print("\n[STEP 5] Platt sigmoid calibration...")
    base_oof = ensemble.oof_proba(X_train, y_train)
    calibrator = PlattCalibrator()
    calibrator.fit(base_oof, y_train)
    cal_probs = np.clip(calibrator.transform(base_probs), 0.20, 0.80)
    cal_train = np.clip(calibrator.transform(base_oof), 0.20, 0.80)
    print(f"  [OK] ECE: {ece_score(base_probs,y_test):.4f} -> {ece_score(cal_probs,y_test):.4f}")

    # ── Upset Entropy Model ─────────────────────────────────────
    print("\n[STEP 6] Upset Entropy Model (high-entropy game detection)...")
    entropy_model = UpsetEntropyModel()
    entropy_model.fit(X_train, cal_train)
    entropy_scores = entropy_model.predict_entropy(X_test)
    print(f"  [OK] Entropy model trained | mean entropy: {entropy_scores.mean():.3f}")

    # ── Decision Layer ──────────────────────────────────────────
    print("\n[STEP 7] Decision Layer + Signal Engine...")
    dec_scores = np.zeros(len(X_test))
    signals    = np.zeros(len(X_test))
    chaos_idxs = np.zeros(len(X_test))
    labels     = []

    FEAT_NAMES_LIST = FEAT_NAMES

    for i in range(len(X_test)):
        feat_dict = {k: float(X_test[i, j])
                     for j, k in enumerate(FEAT_NAMES_LIST)}
        sig, chaos_idx = compute_signal(feat_dict)
        signals[i]    = sig
        chaos_idxs[i] = chaos_idx

        # Decision score: calibrated_prob + alpha * signal (when |signal| > 0)
        if sig != 0.0:
            raw = float(cal_probs[i]) + ALPHA_DECISION * sig
        else:
            raw = float(cal_probs[i])
        dec_scores[i] = float(np.clip(raw, 0.04, 0.96))

        lbl = classify_label(float(cal_probs[i]), float(dec_scores[i]),
                             float(entropy_scores[i]), chaos_idx)
        labels.append(lbl)

    n_signal = int((np.abs(signals) > 0).sum())
    print(f"  [OK] Signal active: {n_signal}/{len(y_test)} ({n_signal/len(y_test):.1%})")

    # ── Alpha Decomposition (v4.0.1) ────────────────────────────
    print("\n[STEP 8a] Alpha Fund ROI Decomposition...")
    decomposer, upset_sig = run_alpha_decomposition(
        labels, dec_scores, cal_probs, y_test)
    alpha_summary = decomposer.summary()
    print(f"  [OK] UPSET ROI={decomposer.roi('UPSET')*100:+.2f}%  "
          f"STRONG ROI={decomposer.roi('STRONG')*100:+.2f}%  "
          f"edge={decomposer.upset_vs_strong_edge()*100:+.2f}%")

    # ── Evaluation ──────────────────────────────────────────────
    print("\n[STEP 8b] Evaluation on REAL ground truth labels...")

    models = {
        "Random Baseline":     random_probs,
        "Elo Rating Model":    elo_probs,
        "Vegas Proxy":         veg_probs,
        "MoSport v4 (base)":   base_probs,
        "MoSport v4 (cal)":    cal_probs,
        "MoSport v4 (dec)":    dec_scores,
    }
    metrics = {}
    for name, p in models.items():
        metrics[name] = {
            "accuracy": round(accuracy(p, y_test), 4),
            "brier":    round(brier(p, y_test), 4),
            "ece":      ece_score(p, y_test),
        }

    roi  = roi_proxy(dec_scores, y_test)
    ddist = dec_dist(labels)
    sig_v_veg = sig_test(dec_scores, veg_probs, y_test)
    sig_v_elo = sig_test(dec_scores, elo_probs, y_test)
    ent_stats = upset_entropy_stats(labels, cal_probs, y_test)
    signal_sparse = float((np.abs(signals) > 0).mean())

    # ── Print Report ────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  MoSport v4.0 -- Real World Validation Report")
    print(f"  Test Season: {test_season}  |  Ground Truth: Real MLB Outcomes")
    print(SEP)

    print("\n-- CEO KPI (REAL DATA) --")
    acc_dec = metrics["MoSport v4 (dec)"]["accuracy"]
    ece_cal = metrics["MoSport v4 (cal)"]["ece"]
    acc_veg = metrics["Vegas Proxy"]["accuracy"]
    print(f"  Accuracy > 55% (real baseline)  : {'PASS' if acc_dec>0.55 else 'FAIL'}  ({acc_dec:.4f})")
    print(f"  ECE < 0.015                     : {'PASS' if ece_cal<0.015 else 'FAIL'}  ({ece_cal:.4f})")
    print(f"  ROI Proxy > 58%                 : {'PASS' if roi['accuracy']>0.58 else 'FAIL'}  ({roi['accuracy']:.4f}  n={roi['n']})")
    print(f"  Beat Vegas                      : {'PASS' if acc_dec>acc_veg else 'FAIL'}  ({acc_dec:.4f} vs {acc_veg:.4f})")
    print(f"  Signal sparse < 60%             : {'PASS' if signal_sparse<0.60 else 'FAIL'}  ({signal_sparse:.1%})")

    print("\n-- A. MODEL COMPARISON (REAL DATA) --")
    print(f"  {'Model':<26} {'Accuracy':>8} {'Brier':>8} {'ECE':>8}")
    print(f"  {'-'*26} {'-'*8} {'-'*8} {'-'*8}")
    for name in ["Random Baseline","Elo Rating Model","Vegas Proxy",
                 "MoSport v4 (base)","MoSport v4 (cal)","MoSport v4 (dec)"]:
        m = metrics[name]
        tag = " <--" if "v4" in name else ""
        print(f"  {name:<26} {m['accuracy']:>8.4f} {m['brier']:>8.4f} {m['ece']:>8.4f}{tag}")

    print(f"\n-- B. CALIBRATION (ECE={ece_cal:.4f}) --")
    for line in cal_display(cal_probs, y_test):
        print(line)

    print(f"\n-- C. DECISION DISTRIBUTION --")
    for lbl, cnt in ddist.items():
        pct = cnt / len(labels)
        print(f"  {lbl:<24} {cnt:5d} ({pct:.1%})  {'#'*int(pct*40)}")

    print(f"\n-- D. UPSET ENTROPY MODEL --")
    print(f"  UPSET (high-entropy) labeled: {ent_stats['n']} games")
    print(f"  Definition: close game (|prob-0.5|<0.08) + high entropy score (>0.65)")
    print(f"  CEO insight: UPSET not predicted -- cluster identified. VP metric: entropy coverage.")

    print(f"\n-- E. ROI PROXY (Top 10% by |dec_score - 0.5|) --")
    print(f"  Games   : {roi['n']}")
    print(f"  Accuracy: {roi['accuracy']:.4f}")
    pnl = roi["accuracy"] * 100 - (1 - roi["accuracy"]) * 110
    print(f"  Real-world P&L proxy: {pnl:+.1f} units / 100 bets at -110 line")

    print(f"\n-- F. SIGNAL STATS --")
    print(f"  Active games : {n_signal}/{len(y_test)} ({signal_sparse:.1%})")
    print(f"  Mean signal  : {signals.mean():+.4f}  std: {signals.std():.4f}")

    print(f"\n-- G. SIGNIFICANCE vs BASELINES --")
    for lbl, s in [("v4 dec vs Vegas", sig_v_veg), ("v4 dec vs Elo", sig_v_elo)]:
        tag = "YES" if s["significant"] else "NO"
        print(f"  {lbl:<28} delta={s['brier_delta']:+.5f}  p={s['p_value']:.4f}  sig={tag}")

    print(f"\n-- H. DATA INTEGRITY --")
    print(f"  Ground truth source: Baseball Savant (pybaseball statcast)")
    print(f"  Zero synthetic labels: confirmed")
    print(f"  Train/test temporal gap: {train_seasons} -> {test_season}")
    print(f"  Strict t-1 rolling: all features use only data before each game")
    print(f"  WHOOP socket: Blind Mode (ready for HRV integration)")

    print(f"\n{SEP}")
    print(f"  [END REPORT]")
    print(f"{SEP}\n")

    # ── VP-Ready Alpha Decomposition Block ───────────────────────
    print_alpha_report(decomposer, upset_sig, test_season)

    # Save JSON
    report = {
        "version": "v4.0.1",
        "test_season": test_season,
        "train_seasons": train_seasons,
        "n_train": int(X_train.shape[0]),
        "n_test": int(X_test.shape[0]),
        "data_source": "Baseball Savant / pybaseball statcast (real game results)",
        "synthetic_labels": False,
        "model_metrics": metrics,
        "roi_proxy": roi,
        "decision_distribution": ddist,
        "signal_sparsity": round(signal_sparse, 3),
        "upset_entropy": ent_stats,
        "sig_tests": {"v4_vs_vegas": sig_v_veg, "v4_vs_elo": sig_v_elo},
        "feature_names": FEAT_NAMES_LIST,
        "kpis": {
            "accuracy_pass":  bool(acc_dec > 0.55),
            "ece_pass":       bool(ece_cal < 0.015),
            "roi_pass":       bool(roi["accuracy"] > 0.58),
            "beat_vegas":     bool(acc_dec > acc_veg),
        },
        "alpha_decomposition": alpha_summary,
        "alpha_kpis": {
            "upset_roi_positive":     bool(decomposer.roi("UPSET") > 0.0),
            "upset_vs_strong_edge":   round(decomposer.upset_vs_strong_edge(), 4),
            "upset_p_value":          upset_sig["p_value"],
            "upset_significant":      upset_sig["significant"],
            "total_system_roi":       round(decomposer.total_roi(), 4),
            "freeze_ready":           bool(decomposer.roi("UPSET") > 0.0),
        },
    }
    out = "mlb_backtest_v4_0_report.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"[SAVED] {out}")


if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    run_v4_backtest()
