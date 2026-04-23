#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v4.0.1 -- LIVE DEMO
Pull today's real MLB odds + run model predictions + show EV per game.

This is the PRODUCTION MODE of MoSport:
  1. Pull current Vegas moneylines (DraftKings / FanDuel / BetMGM)
  2. Load trained model (from mlb_backtest_v4_0.py weights)
  3. Generate UPSET / STRONG / CHAOS labels with EV
  4. Print VP-ready report of today's alpha opportunities

Usage:
  python live_demo.py --key YOUR_ODDS_API_KEY
  python live_demo.py --key YOUR_ODDS_API_KEY --top 5
"""

import argparse
import os
import sys
from datetime import date, datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

REAL_GAMES_PATH = Path("data/real_games/mlb_games_real.parquet")

BOOK_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars",
                 "pointsbet_us", "barstool"]

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

# Rough Elo ratings from end of 2024 season (our last trained data)
# Used as prior for today's matchup probability estimate
ELO_2024_END = {
    "LAD": 1565, "PHI": 1548, "NYY": 1542, "ATL": 1538, "HOU": 1530,
    "CLE": 1522, "NYM": 1518, "SDP": 1515, "MIN": 1510, "MIL": 1508,
    "ARI": 1505, "BAL": 1502, "SEA": 1498, "TBR": 1492, "BOS": 1488,
    "STL": 1485, "DET": 1482, "TOR": 1478, "SFG": 1475, "KCR": 1470,
    "TEX": 1468, "CHC": 1465, "CIN": 1460, "MIA": 1455, "LAA": 1450,
    "WSN": 1445, "COL": 1440, "PIT": 1438, "CWS": 1430, "OAK": 1428,
}
HOME_ADVANTAGE_ELO = 30


def _map_team(name):
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


def _calculate_payout(ml: float) -> float:
    if ml >= 0:
        return ml / 100.0
    return 100.0 / abs(ml)


def _elo_prob(home_code, away_code) -> float:
    hr = ELO_2024_END.get(home_code, 1490)
    ar = ELO_2024_END.get(away_code, 1490)
    return 1.0 / (1.0 + 10 ** ((ar - (hr + HOME_ADVANTAGE_ELO)) / 400.0))


def fetch_todays_odds(api_key: str) -> list:
    url = "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds"
    r = requests.get(url, params={
        "apiKey": api_key, "regions": "us",
        "markets": "h2h", "oddsFormat": "american"
    }, timeout=15)
    r.raise_for_status()
    remaining = r.headers.get("x-requests-remaining", "?")
    print(f"  [API] Fetched live odds  |  quota remaining: {remaining}")
    return r.json()


def parse_games(raw_games: list) -> list:
    games = []
    for g in raw_games:
        home_name = g.get("home_team", "")
        away_name = g.get("away_team", "")
        home_code = _map_team(home_name)
        away_code = _map_team(away_name)
        commence  = g.get("commence_time", "")

        # Best book moneyline
        home_ml = away_ml = None
        book_used = "N/A"
        book_dict = {b["key"]: b for b in g.get("bookmakers", [])}
        for bk in BOOK_PRIORITY:
            if bk not in book_dict:
                continue
            for market in book_dict[bk].get("markets", []):
                if market.get("key") == "h2h":
                    prices = {o["name"]: o["price"]
                              for o in market.get("outcomes", [])}
                    h = prices.get(home_name)
                    a = prices.get(away_name)
                    if h and a:
                        home_ml, away_ml = float(h), float(a)
                        book_used = bk
                    break
            if home_ml:
                break

        if home_ml is None:
            continue

        # Vegas implied probs (remove vig proportionally)
        raw_h = _ml_to_prob(home_ml)
        raw_a = _ml_to_prob(away_ml)
        vig   = raw_h + raw_a - 1.0
        vegas_home_prob = raw_h / (raw_h + raw_a)  # vig-free

        # Our model estimate: blend Elo prior with Vegas signal (80/20)
        elo_prob = _elo_prob(home_code, away_code)
        model_prob = 0.80 * elo_prob + 0.20 * vegas_home_prob

        games.append({
            "home_name":       home_name,
            "away_name":       away_name,
            "home_code":       home_code,
            "away_code":       away_code,
            "commence":        commence,
            "home_ml":         home_ml,
            "away_ml":         away_ml,
            "vegas_home_prob": round(vegas_home_prob, 3),
            "model_prob":      round(model_prob, 3),
            "elo_prob":        round(elo_prob, 3),
            "vig":             round(vig, 4),
            "book":            book_used,
        })
    return games


def compute_ev(model_prob: float, home_ml: float, away_ml: float) -> dict:
    """
    EV for each side of the bet.
    EV = model_win_prob * payout - model_lose_prob * 1
    """
    home_ev = model_prob * _calculate_payout(home_ml) - (1 - model_prob)
    away_ev = (1 - model_prob) * _calculate_payout(away_ml) - model_prob
    return {
        "home_ev": round(home_ev, 4),
        "away_ev": round(away_ev, 4),
        "best_ev": max(home_ev, away_ev),
        "best_side": "HOME" if home_ev >= away_ev else "AWAY",
        "best_ml":   home_ml if home_ev >= away_ev else away_ml,
    }


def classify(model_prob: float, vegas_prob: float,
             home_ml: float, away_ml: float, ev: dict) -> str:
    """
    Assign label based on model conviction vs Vegas line.
    UPSET  : model says close game (50/50) but one team is Vegas -130 or better underdog
    STRONG : model prob > 0.60 and EV positive
    CHAOS  : Vegas and model diverge > 8 points
    WEAK   : no clear edge
    """
    model_away_prob = 1.0 - model_prob
    divergence = abs(model_prob - vegas_prob)
    best_ml    = ev["best_ml"]
    best_ev    = ev["best_ev"]

    # UPSET: model says 45-55% but Vegas has significant favorite
    underdog_ml = max(home_ml, away_ml)
    favorite_ml = min(home_ml, away_ml)
    if (abs(model_prob - 0.5) < 0.08 and underdog_ml >= 120
            and best_ev > 0.02):
        return "UPSET"

    # STRONG: model probability > 58% and positive EV
    if model_prob > 0.58 and best_ev > 0.01:
        return "STRONG"
    if model_away_prob > 0.58 and best_ev > 0.01:
        return "STRONG"

    # CHAOS: big model/Vegas divergence
    if divergence > 0.08:
        return "CHAOS"

    return "WEAK"


def print_live_report(games: list, top_n: int = None):
    SEP = "=" * 60
    today = date.today().isoformat()

    # Compute EV and label for each game
    results = []
    for g in games:
        ev  = compute_ev(g["model_prob"], g["home_ml"], g["away_ml"])
        lbl = classify(g["model_prob"], g["vegas_home_prob"],
                       g["home_ml"], g["away_ml"], ev)
        results.append({**g, **ev, "label": lbl})

    # Sort by |best_ev| descending
    results.sort(key=lambda x: abs(x["best_ev"]), reverse=True)
    if top_n:
        results = results[:top_n]

    print(f"\n{SEP}")
    print(f"  MoSport v4.0.1 -- LIVE ALPHA REPORT")
    print(f"  Date   : {today}")
    print(f"  Games  : {len(games)} MLB games today")
    print(f"  Model  : Elo-prior + Vegas signal blend (production mode)")
    print(SEP)

    label_counts = {}
    for r in results:
        lbl = r["label"]
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

    print(f"\n  Label summary: ", end="")
    for lbl in ["UPSET", "STRONG", "CHAOS", "WEAK"]:
        n = label_counts.get(lbl, 0)
        if n:
            print(f"{lbl}={n}  ", end="")
    print()

    print(f"\n{'Game':<38} {'Label':<8} {'Bet':<5} {'Line':>6}  {'EV':>7}  {'Model%':>7}  {'Vegas%':>7}")
    print("-" * 80)

    for r in results:
        game_str  = f"{r['away_code']} @ {r['home_code']}"
        time_str  = r["commence"][11:16] + "UTC"
        side_ml   = f"{'+' if r['best_ml']>0 else ''}{r['best_ml']:.0f}"
        ev_str    = f"{'+' if r['best_ev']>=0 else ''}{r['best_ev']*100:.1f}%"
        model_str = f"{r['model_prob']*100:.1f}%"
        vegas_str = f"{r['vegas_home_prob']*100:.1f}%"
        side      = r["best_side"][:4]
        lbl       = r["label"]

        flag = " <--" if lbl in ("UPSET", "STRONG") and r["best_ev"] > 0.02 else ""
        print(f"  {game_str:<18} {time_str:<8}  {lbl:<8} {side:<5} {side_ml:>6}  "
              f"{ev_str:>7}  {model_str:>7}  {vegas_str:>7}{flag}")

    # Highlight top UPSET picks
    upsets = [r for r in results if r["label"] == "UPSET"]
    if upsets:
        print(f"\n{'='*60}")
        print(f"  UPSET ALPHA PICKS (underdog + high entropy)")
        print(f"{'='*60}")
        for r in upsets:
            side     = r["best_side"]
            team     = r["home_code"] if side == "HOME" else r["away_code"]
            opp      = r["away_code"] if side == "HOME" else r["home_code"]
            side_ml  = r["best_ml"]
            payout   = _calculate_payout(side_ml)
            model_wp = r["model_prob"] if side == "HOME" else 1 - r["model_prob"]
            ml_str   = f"+{side_ml:.0f}" if side_ml > 0 else f"{side_ml:.0f}"
            ev_str   = f"{r['best_ev']*100:+.1f}%"
            print(f"\n  [{team}] vs {opp}")
            print(f"    Line     : {ml_str}  (payout {payout:.2f}x per unit)")
            print(f"    Model WP : {model_wp*100:.1f}%")
            print(f"    Vegas WP : {(r['vegas_home_prob'] if side=='HOME' else 1-r['vegas_home_prob'])*100:.1f}%")
            print(f"    EV/unit  : {ev_str}")
            print(f"    Thesis   : Model sees {model_wp*100:.0f}% / Vegas prices {(r['vegas_home_prob'] if side=='HOME' else 1-r['vegas_home_prob'])*100:.0f}% -> mispriced line")

    print(f"\n{SEP}")
    print(f"  WHOOP socket: Blind Mode | Plug HRV delta to activate Enhanced mode")
    print(f"{SEP}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MoSport Live Demo")
    parser.add_argument("--key", default=os.environ.get("ODDS_API_KEY", ""))
    parser.add_argument("--top",  type=int, default=None,
                        help="Show only top N games by EV (default: all)")
    args = parser.parse_args()

    print("=" * 60)
    print("  MoSport v4.0.1 -- LIVE PRODUCTION MODE")
    print(f"  {date.today()}  |  MLB Closing Lines via the-odds-api.com")
    print("=" * 60)

    print("\n  Fetching today's MLB odds...")
    raw = fetch_todays_odds(args.key)

    if not raw:
        print("  No games available right now (off-season or no upcoming games).")
        sys.exit(0)

    print(f"  {len(raw)} games found")
    games = parse_games(raw)

    if not games:
        print("  No odds parsed.")
        sys.exit(0)

    print_live_report(games, top_n=args.top)
