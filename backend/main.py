"""
MoSport v4.0.1 — Decision Engine API
FastAPI backend for Railway deployment.
No DATABASE_URL required. Reads from local parquet on startup (if present).
"""

import os
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MoSport Decision Engine", version="4.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "7a473a48e8f3dd68b6824e8f9112974a")
ODDS_API_BASE = "https://api.the-odds-api.com"
BOOK_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbet_us"]

ODDS_API_TEAM_MAP = {
    "New York Yankees": "NYY", "Boston Red Sox": "BOS",
    "Tampa Bay Rays": "TBR", "Toronto Blue Jays": "TOR",
    "Baltimore Orioles": "BAL", "Chicago White Sox": "CWS",
    "Minnesota Twins": "MIN", "Cleveland Guardians": "CLE",
    "Cleveland Indians": "CLE", "Kansas City Royals": "KCR",
    "Detroit Tigers": "DET", "Houston Astros": "HOU",
    "Oakland Athletics": "OAK", "Athletics": "OAK",
    "Texas Rangers": "TEX", "Los Angeles Angels": "LAA",
    "Seattle Mariners": "SEA", "New York Mets": "NYM",
    "Philadelphia Phillies": "PHI", "Atlanta Braves": "ATL",
    "Miami Marlins": "MIA", "Washington Nationals": "WSN",
    "Chicago Cubs": "CHC", "St. Louis Cardinals": "STL",
    "Milwaukee Brewers": "MIL", "Cincinnati Reds": "CIN",
    "Pittsburgh Pirates": "PIT", "Los Angeles Dodgers": "LAD",
    "San Diego Padres": "SDP", "San Francisco Giants": "SFG",
    "Colorado Rockies": "COL", "Arizona Diamondbacks": "ARI",
}

ELO_2024_END = {
    "LAD": 1565, "PHI": 1548, "NYY": 1542, "ATL": 1538, "HOU": 1530,
    "CLE": 1522, "NYM": 1518, "SDP": 1515, "MIN": 1510, "MIL": 1508,
    "ARI": 1505, "BAL": 1502, "SEA": 1498, "TBR": 1492, "BOS": 1488,
    "STL": 1485, "DET": 1482, "TOR": 1478, "SFG": 1475, "KCR": 1470,
    "TEX": 1468, "CHC": 1465, "CIN": 1460, "MIA": 1455, "LAA": 1450,
    "WSN": 1445, "COL": 1440, "PIT": 1438, "CWS": 1430, "OAK": 1428,
}
HOME_ADV_ELO = 30


# ── Helpers ──────────────────────────────────────────────────────────────────

def _map_team(name: str) -> str:
    if name in ODDS_API_TEAM_MAP:
        return ODDS_API_TEAM_MAP[name]
    for key, code in ODDS_API_TEAM_MAP.items():
        if name.lower() in key.lower():
            return code
    return name[:3].upper()


def _ml_to_prob(ml: float) -> float:
    if ml < 0:
        return abs(ml) / (abs(ml) + 100)
    return 100.0 / (ml + 100)


def _elo_prob(home: str, away: str) -> float:
    h_elo = ELO_2024_END.get(home, 1500) + HOME_ADV_ELO
    a_elo = ELO_2024_END.get(away, 1500)
    return 1.0 / (1.0 + 10 ** ((a_elo - h_elo) / 400.0))


def _payout(ml: float) -> float:
    return 100.0 / abs(ml) if ml < 0 else ml / 100.0


def _compute_ev(model_prob: float, home_ml: float, away_ml: float) -> dict:
    home_ev = model_prob * _payout(home_ml) - (1 - model_prob)
    away_ev = (1 - model_prob) * _payout(away_ml) - model_prob
    best_side = "HOME" if home_ev >= away_ev else "AWAY"
    return {
        "home_ev": round(home_ev, 4),
        "away_ev": round(away_ev, 4),
        "best_ev": round(max(home_ev, away_ev), 4),
        "best_side": best_side,
        "best_ml": home_ml if best_side == "HOME" else away_ml,
    }


def _classify(model_prob: float, vegas_prob: float,
               home_ml: float, away_ml: float, ev: dict) -> str:
    underdog_ml = max(home_ml, away_ml)
    divergence = abs(model_prob - vegas_prob)
    best_ev = ev["best_ev"]

    if abs(model_prob - 0.5) < 0.08 and underdog_ml >= 120 and best_ev > 0.02:
        return "UPSET"
    if model_prob > 0.58 and best_ev > 0.01:
        return "STRONG"
    if (1 - model_prob) > 0.58 and best_ev > 0.01:
        return "STRONG"
    if divergence > 0.08:
        return "CHAOS"
    return "WEAK"


def _parse_raw_games(raw: list) -> list:
    games = []
    for event in raw:
        home_name = event.get("home_team", "")
        away_name = event.get("away_team", "")
        home_code = _map_team(home_name)
        away_code = _map_team(away_name)
        commence = event.get("commence_time", "")

        book_dict = {b["key"]: b for b in event.get("bookmakers", [])}
        home_ml = away_ml = None
        book_used = None

        for bk in BOOK_PRIORITY:
            if bk not in book_dict:
                continue
            for market in book_dict[bk].get("markets", []):
                if market.get("key") == "h2h":
                    prices = {o["name"]: o["price"] for o in market.get("outcomes", [])}
                    h = prices.get(home_name)
                    a = prices.get(away_name)
                    if h and a:
                        home_ml, away_ml = float(h), float(a)
                        book_used = bk
                break
            if home_ml is not None:
                break

        if home_ml is None:
            continue

        raw_h = _ml_to_prob(home_ml)
        raw_a = _ml_to_prob(away_ml)
        vegas_home_prob = raw_h / (raw_h + raw_a)
        elo_prob = _elo_prob(home_code, away_code)
        model_prob = 0.80 * elo_prob + 0.20 * vegas_home_prob

        ev = _compute_ev(model_prob, home_ml, away_ml)
        label = _classify(model_prob, vegas_home_prob, home_ml, away_ml, ev)

        best_side = ev["best_side"]
        best_team = home_code if best_side == "HOME" else away_code
        best_ml = ev["best_ml"]

        games.append({
            "game_id": f"{away_code}@{home_code}_{commence[:10]}",
            "home_team": home_code,
            "away_team": away_code,
            "home_name": home_name,
            "away_name": away_name,
            "commence_time": commence,
            "home_ml": home_ml,
            "away_ml": away_ml,
            "vegas_home_prob": round(vegas_home_prob, 3),
            "model_prob": round(model_prob, 3),
            "elo_prob": round(elo_prob, 3),
            "vig": round(raw_h + raw_a - 1.0, 4),
            "book": book_used,
            "label": label,
            "best_side": best_side,
            "best_team": best_team,
            "best_ml": best_ml,
            "best_ev": ev["best_ev"],
            "home_ev": ev["home_ev"],
            "away_ev": ev["away_ev"],
            "decision": {
                "label": label,
                "score": round(abs(ev["best_ev"]) * 100, 1),
                "ev_pct": round(ev["best_ev"] * 100, 2),
                "model_win_pct": round(model_prob * 100, 1),
                "vegas_win_pct": round(vegas_home_prob * 100, 1),
                "best_side": best_side,
                "best_ml": best_ml,
                "causal_factors": _causal_factors(model_prob, vegas_home_prob, label),
            },
        })

    games.sort(key=lambda x: abs(x["best_ev"]), reverse=True)
    return games


def _causal_factors(model_prob: float, vegas_prob: float, label: str) -> list:
    factors = []
    divergence = abs(model_prob - vegas_prob)
    if divergence > 0.05:
        factors.append({
            "key": "line_divergence",
            "label": "Line Divergence",
            "value": f"{divergence * 100:.1f}pp",
            "positive": model_prob > vegas_prob,
        })
    if label == "UPSET":
        factors.append({
            "key": "entropy",
            "label": "High Entropy",
            "value": f"{round(0.85 + (1 - abs(model_prob - 0.5) * 4) * 0.10, 2)}",
            "positive": True,
        })
    if label == "STRONG":
        factors.append({
            "key": "conviction",
            "label": "Model Conviction",
            "value": f"{model_prob * 100:.0f}%",
            "positive": True,
        })
    factors.append({
        "key": "elo_prior",
        "label": "Elo Prior",
        "value": f"{model_prob * 100:.1f}%",
        "positive": model_prob > 0.5,
    })
    return factors[:3]


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "MoSport Decision Engine",
        "version": "4.0.1",
        "date": date.today().isoformat(),
    }


@app.get("/live-odds")
def live_odds():
    """Fetch today's MLB odds from the-odds-api.com and return raw JSON."""
    try:
        resp = requests.get(
            f"{ODDS_API_BASE}/v4/sports/baseball_mlb/odds",
            params={
                "apiKey": ODDS_API_KEY,
                "regions": "us",
                "markets": "h2h",
                "oddsFormat": "american",
            },
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Odds API error: {e}")

    quota_remaining = resp.headers.get("x-requests-remaining", "unknown")
    raw = resp.json()
    return {"quota_remaining": quota_remaining, "count": len(raw), "games": raw}


@app.get("/games")
def get_games(top: Optional[int] = None):
    """
    Fetch live odds, run v4.0.1 decision logic, return labeled game decisions.
    """
    try:
        resp = requests.get(
            f"{ODDS_API_BASE}/v4/sports/baseball_mlb/odds",
            params={
                "apiKey": ODDS_API_KEY,
                "regions": "us",
                "markets": "h2h",
                "oddsFormat": "american",
            },
            timeout=10,
        )
        resp.raise_for_status()
        raw = resp.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Odds API error: {e}")

    games = _parse_raw_games(raw)
    if top:
        games = games[:top]

    upset = [g for g in games if g["label"] == "UPSET"]
    strong = [g for g in games if g["label"] == "STRONG"]
    chaos = [g for g in games if g["label"] == "CHAOS"]
    weak = [g for g in games if g["label"] == "WEAK"]

    return {
        "date": date.today().isoformat(),
        "version": "4.0.1",
        "total_games": len(games),
        "summary": {
            "UPSET": len(upset),
            "STRONG": len(strong),
            "CHAOS": len(chaos),
            "WEAK": len(weak),
        },
        "games": games,
    }


@app.get("/predict/{away_team}/{home_team}")
def predict(away_team: str, home_team: str, home_ml: float = -110, away_ml: float = -110):
    """
    Run v4.0.1 decision logic for a specific matchup.
    Provide moneylines (American format, e.g. -156 or +132).
    """
    away = away_team.upper()
    home = home_team.upper()

    raw_h = _ml_to_prob(home_ml)
    raw_a = _ml_to_prob(away_ml)
    vegas_home_prob = raw_h / (raw_h + raw_a)
    elo_prob = _elo_prob(home, away)
    model_prob = 0.80 * elo_prob + 0.20 * vegas_home_prob

    ev = _compute_ev(model_prob, home_ml, away_ml)
    label = _classify(model_prob, vegas_home_prob, home_ml, away_ml, ev)

    return {
        "game": f"{away} @ {home}",
        "model_prob": round(model_prob, 3),
        "vegas_home_prob": round(vegas_home_prob, 3),
        "elo_prob": round(elo_prob, 3),
        "label": label,
        "best_side": ev["best_side"],
        "best_ml": ev["best_ml"],
        "best_ev_pct": round(ev["best_ev"] * 100, 2),
        "home_ev_pct": round(ev["home_ev"] * 100, 2),
        "away_ev_pct": round(ev["away_ev"] * 100, 2),
    }
