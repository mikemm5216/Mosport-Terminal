#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v4.0.1 -- The-Odds-API Historical MLB Closing Lines
STEP 1B (Alt): Pull real Vegas closing moneylines from the-odds-api.com

Free tier: 500 requests/month
  - 2024 season (Apr-Sep) = ~180 game-dates -> 180 requests
  - 2023 season            = ~180 game-dates -> 180 requests
  - Total: ~360 requests (fits in free monthly quota)

Sign up (free): https://the-odds-api.com
API key env var: ODDS_API_KEY
  or pass: python fetch_odds_api.py --key YOUR_KEY_HERE

Output:
  data/odds_cache/odds_api_{date}.json     (raw daily cache)
  data/real_games/mlb_odds_real.parquet    (parsed, one row per game)
  data/real_games/mlb_games_with_odds.parquet  (merged with game dataset)

Usage:
  python fetch_odds_api.py --key YOUR_KEY
  python fetch_odds_api.py --key YOUR_KEY --seasons 2024
  python fetch_odds_api.py --key YOUR_KEY --check-quota   # just show remaining
"""

import argparse
import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ODDS_CACHE_DIR  = Path("data/odds_cache/odds_api")
REAL_GAMES_DIR  = Path("data/real_games")
ODDS_PATH       = REAL_GAMES_DIR / "mlb_odds_real.parquet"
MERGED_PATH     = REAL_GAMES_DIR / "mlb_games_with_odds.parquet"
REAL_GAMES_PATH = REAL_GAMES_DIR / "mlb_games_real.parquet"

BASE_URL    = "https://api.the-odds-api.com/v4"
SPORT       = "baseball_mlb"
REGIONS     = "us"
MARKETS     = "h2h"           # moneyline only
ODDS_FORMAT = "american"

# MLB regular season date ranges per season
SEASON_RANGES = {
    2021: (date(2021, 4,  1), date(2021, 10,  3)),
    2022: (date(2022, 4,  7), date(2022, 10,  5)),
    2023: (date(2023, 3, 30), date(2023, 10,  1)),
    2024: (date(2024, 3, 20), date(2024, 9,  29)),
}

# The-odds-api team name -> our Baseball Savant team code
ODDS_API_TEAM_MAP = {
    "New York Yankees":          "NYY",
    "Boston Red Sox":            "BOS",
    "Tampa Bay Rays":            "TBR",
    "Toronto Blue Jays":         "TOR",
    "Baltimore Orioles":         "BAL",
    "Chicago White Sox":         "CWS",
    "Minnesota Twins":           "MIN",
    "Cleveland Guardians":       "CLE",
    "Cleveland Indians":         "CLE",
    "Kansas City Royals":        "KCR",
    "Detroit Tigers":            "DET",
    "Houston Astros":            "HOU",
    "Oakland Athletics":         "OAK",
    "Texas Rangers":             "TEX",
    "Los Angeles Angels":        "LAA",
    "Seattle Mariners":          "SEA",
    "New York Mets":             "NYM",
    "Philadelphia Phillies":     "PHI",
    "Atlanta Braves":            "ATL",
    "Miami Marlins":             "MIA",
    "Washington Nationals":      "WSN",
    "Chicago Cubs":              "CHC",
    "St. Louis Cardinals":       "STL",
    "Milwaukee Brewers":         "MIL",
    "Cincinnati Reds":           "CIN",
    "Pittsburgh Pirates":        "PIT",
    "Los Angeles Dodgers":       "LAD",
    "San Diego Padres":          "SDP",
    "San Francisco Giants":      "SFG",
    "Colorado Rockies":          "COL",
    "Arizona Diamondbacks":      "ARI",
    "Athletics":                 "OAK",
    "Sacramento River Cats":     "OAK",   # 2025 relocation edge case
}


def _map_team(name: str) -> str:
    if name in ODDS_API_TEAM_MAP:
        return ODDS_API_TEAM_MAP[name]
    # Fuzzy: last word
    parts = name.strip().split()
    for n in [name, parts[-1] if parts else ""]:
        for key, code in ODDS_API_TEAM_MAP.items():
            if n.lower() in key.lower() or key.lower().endswith(n.lower()):
                return code
    return None


def check_quota(api_key: str):
    """Hit a lightweight endpoint to show remaining requests."""
    url = f"{BASE_URL}/sports"
    r = requests.get(url, params={"apiKey": api_key}, timeout=10)
    remaining = r.headers.get("x-requests-remaining", "?")
    used      = r.headers.get("x-requests-used", "?")
    print(f"  Quota used: {used}  |  Remaining: {remaining}")
    return r.status_code == 200


def fetch_day(api_key: str, snapshot_dt: str, force: bool = False) -> dict:
    """
    Fetch historical odds snapshot for one datetime.
    snapshot_dt: ISO 8601, e.g. '2024-07-15T18:00:00Z'
    Returns raw API response dict or None on failure.
    """
    date_tag  = snapshot_dt[:10]
    cache_file = ODDS_CACHE_DIR / f"{date_tag}.json"

    if cache_file.exists() and not force:
        with open(cache_file, "r") as f:
            return json.load(f)

    url = f"{BASE_URL}/historical/sports/{SPORT}/odds"
    params = {
        "apiKey":     api_key,
        "regions":    REGIONS,
        "markets":    MARKETS,
        "oddsFormat": ODDS_FORMAT,
        "date":       snapshot_dt,
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        remaining = r.headers.get("x-requests-remaining", "?")

        if r.status_code == 401:
            print(f"\n  ERROR 401: Invalid API key. Check your key at the-odds-api.com")
            sys.exit(1)
        if r.status_code == 422:
            # Date out of range or no data
            return {"data": []}
        r.raise_for_status()

        data = r.json()
        ODDS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(cache_file, "w") as f:
            json.dump(data, f)

        return data

    except requests.exceptions.HTTPError as e:
        print(f"  HTTP error: {e}")
        return {"data": []}
    except Exception as e:
        print(f"  Error: {e}")
        return {"data": []}


def parse_day(raw: dict, snapshot_date: date) -> list:
    """
    Parse one day's API response into a list of game-odds dicts.
    Extracts home_close_ml and away_close_ml from the best US book.
    """
    games_data = raw.get("data", raw) if isinstance(raw, dict) else raw
    if not isinstance(games_data, list):
        return []

    records = []
    BOOK_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars",
                     "pointsbet_us", "barstool", "unibet_us"]

    for game in games_data:
        try:
            sport_key = game.get("sport_key", "")
            if "baseball_mlb" not in sport_key:
                continue

            home_name = game.get("home_team", "")
            away_name = game.get("away_team", "")
            home_code = _map_team(home_name)
            away_code = _map_team(away_name)

            if not home_code or not away_code:
                continue

            # Parse commence time as date
            commence = game.get("commence_time", "")
            try:
                game_date = pd.to_datetime(commence).date()
            except Exception:
                game_date = snapshot_date

            # Find best available book's h2h moneyline
            bookmakers = game.get("bookmakers", [])
            home_ml, away_ml = None, None

            # Try priority books first
            book_dict = {b["key"]: b for b in bookmakers}
            for book_key in BOOK_PRIORITY:
                if book_key in book_dict:
                    bm = book_dict[book_key]
                    for market in bm.get("markets", []):
                        if market.get("key") == "h2h":
                            outcomes = {o["name"]: o["price"]
                                        for o in market.get("outcomes", [])}
                            h = outcomes.get(home_name)
                            a = outcomes.get(away_name)
                            if h is not None and a is not None:
                                home_ml, away_ml = float(h), float(a)
                            break
                    if home_ml is not None:
                        break

            # Fallback: any book
            if home_ml is None:
                for bm in bookmakers:
                    for market in bm.get("markets", []):
                        if market.get("key") == "h2h":
                            outcomes = {o["name"]: o["price"]
                                        for o in market.get("outcomes", [])}
                            h = outcomes.get(home_name)
                            a = outcomes.get(away_name)
                            if h is not None and a is not None:
                                home_ml, away_ml = float(h), float(a)
                            break
                    if home_ml is not None:
                        break

            if home_ml is None:
                continue

            records.append({
                "game_date":     game_date,
                "home_team":     home_code,
                "away_team":     away_code,
                "home_close_ml": home_ml,
                "away_close_ml": away_ml,
                "game_id_api":   game.get("id", ""),
            })

        except Exception:
            continue

    return records


def fetch_season(api_key: str, season: int, force: bool = False,
                 delay: float = 1.2) -> pd.DataFrame:
    """
    Fetch all game-dates for one season.
    Snapshots at game-day 20:00 UTC (closing line window).
    Returns DataFrame of all games with odds.
    """
    if season not in SEASON_RANGES:
        print(f"  Season {season} not in range table. Skipping.")
        return pd.DataFrame()

    start_d, end_d = SEASON_RANGES[season]
    all_records = []
    current     = start_d
    total_days  = (end_d - start_d).days + 1
    fetched     = 0

    print(f"\n  Season {season}: {start_d} -> {end_d}  ({total_days} days)")

    while current <= end_d:
        # 20:00 UTC = approx closing line time for afternoon/evening games
        snapshot = f"{current.isoformat()}T20:00:00Z"
        cache_file = ODDS_CACHE_DIR / f"{current.isoformat()}.json"

        if cache_file.exists() and not force:
            raw = json.loads(cache_file.read_text())
        else:
            raw = fetch_day(api_key, snapshot, force=force)
            fetched += 1
            time.sleep(delay)  # rate limiting courtesy

        day_records = parse_day(raw, current)
        all_records.extend(day_records)

        if len(day_records) > 0:
            print(f"    {current}  {len(day_records):2d} games", end="\r", flush=True)

        current += timedelta(days=1)

    print(f"\n  -> {len(all_records):,} game-odds parsed  ({fetched} API calls made)")
    return pd.DataFrame(all_records)


def merge_with_games(odds_df: pd.DataFrame) -> pd.DataFrame:
    """Left-join odds onto mlb_games_real.parquet."""
    if not REAL_GAMES_PATH.exists():
        print("ERROR: mlb_games_real.parquet not found. Run build_real_dataset_v4.py first.")
        sys.exit(1)

    games = pd.read_parquet(REAL_GAMES_PATH)
    games["game_date"] = pd.to_datetime(games["game_date"]).dt.date
    odds_df["game_date"] = pd.to_datetime(odds_df["game_date"]).dt.date

    # Deduplicate odds (keep first occurrence per game)
    odds_df = odds_df.drop_duplicates(["game_date", "home_team", "away_team"])

    merged = games.merge(
        odds_df[["game_date", "home_team", "away_team",
                 "home_close_ml", "away_close_ml"]],
        on=["game_date", "home_team", "away_team"],
        how="left",
    )

    matched   = merged["home_close_ml"].notna().sum()
    match_pct = matched / len(merged) * 100
    print(f"\n  Merge: {len(merged):,} games | matched {matched:,} ({match_pct:.1f}%)")
    print(f"  Missing {len(merged)-matched:,} games -> synthetic odds fallback in backtest")

    return merged


def validate_odds(df: pd.DataFrame):
    """Sanity checks."""
    with_odds = df[df["home_close_ml"].notna()].copy()
    if len(with_odds) == 0:
        print("  No odds matched -- check API key and season ranges.")
        return

    def ml_to_prob(ml):
        ml = np.array(ml, dtype=float)
        return np.where(ml < 0, np.abs(ml)/(np.abs(ml)+100), 100/(ml+100))

    hi = ml_to_prob(with_odds["home_close_ml"].values)
    ai = ml_to_prob(with_odds["away_close_ml"].values)

    print(f"\n-- ODDS VALIDATION --")
    print(f"  Games with real odds   : {len(with_odds):,}")
    print(f"  Home favored           : {(with_odds['home_close_ml']<0).mean():.1%}")
    print(f"  Avg vig (overround)    : {(hi+ai-1).mean():.3f}")
    print(f"  Vegas ML accuracy      : {((with_odds['home_close_ml']<0)==(with_odds['home_win']==1)).mean():.3f}")
    print(f"  Home ML range          : {with_odds['home_close_ml'].min():.0f} to {with_odds['home_close_ml'].max():.0f}")

    # Per-season breakdown
    print(f"\n  Per-season match rate:")
    for s, g in df.groupby("season"):
        m = g["home_close_ml"].notna().sum()
        print(f"    {s}: {m:,}/{len(g):,}  ({m/len(g):.1%})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="MoSport v4.0.1 -- The-Odds-API Historical Closing Lines")
    parser.add_argument("--key", type=str,
                        default=os.environ.get("ODDS_API_KEY", ""),
                        help="API key from the-odds-api.com (or set ODDS_API_KEY env var)")
    parser.add_argument("--seasons", nargs="+", type=int,
                        default=[2021, 2022, 2023, 2024])
    parser.add_argument("--force",       action="store_true")
    parser.add_argument("--check-quota", action="store_true",
                        help="Show remaining API quota and exit")
    parser.add_argument("--delay", type=float, default=1.2,
                        help="Seconds between API calls (default 1.2)")
    args = parser.parse_args()

    if not args.key:
        print("ERROR: No API key provided.")
        print("  Get a free key at: https://the-odds-api.com")
        print("  Then run: python fetch_odds_api.py --key YOUR_KEY")
        print("  Or set:   set ODDS_API_KEY=YOUR_KEY  (Windows)")
        sys.exit(1)

    print("=" * 60)
    print("  MoSport v4.0.1 -- Odds API Historical Ingestion")
    print("  Source: the-odds-api.com (real closing moneylines)")
    print("  Book priority: DraftKings > FanDuel > BetMGM > Caesars")
    print("=" * 60)

    ODDS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    REAL_GAMES_DIR.mkdir(parents=True, exist_ok=True)

    print("\n  Checking API key and quota...")
    if not check_quota(args.key):
        print("  ERROR: API key invalid or quota exhausted.")
        sys.exit(1)

    if args.check_quota:
        sys.exit(0)

    # Fetch all seasons
    all_odds = []
    for season in args.seasons:
        df_s = fetch_season(args.key, season, force=args.force, delay=args.delay)
        if len(df_s) > 0:
            all_odds.append(df_s)

    print("\n  Checking quota after fetch...")
    check_quota(args.key)

    if not all_odds:
        print("ERROR: No odds data retrieved.")
        sys.exit(1)

    odds_df = pd.concat(all_odds, ignore_index=True)
    odds_df = odds_df.drop_duplicates(["game_date", "home_team", "away_team"])
    odds_df.to_parquet(ODDS_PATH, index=False)
    print(f"\n[SAVED] {ODDS_PATH}  ({len(odds_df):,} games)")

    merged = merge_with_games(odds_df)
    merged.to_parquet(MERGED_PATH, index=False)
    print(f"[SAVED] {MERGED_PATH}")

    validate_odds(merged)

    print("\n[DONE] Re-run mlb_backtest_v4_0.py -- real odds will load automatically.")
    print("       mlb_games_with_odds.parquet detected -> ROI engine uses real closing lines.")
