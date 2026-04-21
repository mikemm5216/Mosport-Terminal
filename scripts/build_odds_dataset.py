#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v4.0.1 -- Vegas Closing Odds Ingestion
STEP 1B: Pull real MLB closing moneylines from Sportsbookreviewsonline.com

Source: https://www.sportsbookreviewsonline.com/scoresoddsarchives/mlb/
Format: Excel file per season, 2 rows per game (away row then home row)

Output: data/real_games/mlb_odds_real.parquet
  One row per game. Columns: game_date, home_team, away_team,
  home_close_ml, away_close_ml, home_close_ml_open, away_close_ml_open

Merge: data/real_games/mlb_games_with_odds.parquet
  Full game dataset (mlb_games_real.parquet) LEFT-JOINED with odds.
  ~85-92% match rate expected (some games have NaN odds = fall back to prob-derived).

Usage:
  python build_odds_dataset.py
  python build_odds_dataset.py --seasons 2024
  python build_odds_dataset.py --force
"""

import argparse
import io
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ODDS_DIR       = Path("data/odds_cache")
REAL_GAMES_DIR = Path("data/real_games")
ODDS_PATH      = REAL_GAMES_DIR / "mlb_odds_real.parquet"
MERGED_PATH    = REAL_GAMES_DIR / "mlb_games_with_odds.parquet"
REAL_GAMES_PATH = REAL_GAMES_DIR / "mlb_games_real.parquet"

# SBRO URL pattern
SBRO_URL = "https://www.sportsbookreviewsonline.com/scoresoddsarchives/mlb/mlb%20odds%20{year}.xlsx"

# SBRO team name -> our Baseball Savant team code
SBRO_TEAM_MAP = {
    # AL East
    "Yankees":        "NYY",
    "Red Sox":        "BOS",
    "Rays":           "TBR",
    "Blue Jays":      "TOR",
    "Orioles":        "BAL",
    # AL Central
    "White Sox":      "CWS",
    "Twins":          "MIN",
    "Guardians":      "CLE",
    "Indians":        "CLE",   # pre-2022
    "Royals":         "KCR",
    "Tigers":         "DET",
    # AL West
    "Astros":         "HOU",
    "Athletics":      "OAK",
    "A's":            "OAK",
    "Rangers":        "TEX",
    "Angels":         "LAA",
    "Mariners":       "SEA",
    # NL East
    "Mets":           "NYM",
    "Phillies":       "PHI",
    "Braves":         "ATL",
    "Marlins":        "MIA",
    "Nationals":      "WSN",
    # NL Central
    "Cubs":           "CHC",
    "Cardinals":      "STL",
    "Brewers":        "MIL",
    "Reds":           "CIN",
    "Pirates":        "PIT",
    # NL West
    "Dodgers":        "LAD",
    "Padres":         "SDP",
    "Giants":         "SFG",
    "Rockies":        "COL",
    "Diamondbacks":   "ARI",
    "D-backs":        "ARI",
}


def download_sbro(season: int, force: bool = False) -> pd.DataFrame:
    """Download and parse SBRO Excel for one season."""
    cache = ODDS_DIR / f"sbro_mlb_{season}.xlsx"
    ODDS_DIR.mkdir(parents=True, exist_ok=True)

    if cache.exists() and not force:
        print(f"    [cache] sbro_mlb_{season}.xlsx")
        raw = pd.read_excel(cache, header=0)
    else:
        url = SBRO_URL.format(year=season)
        print(f"    [download] {url} ... ", end="", flush=True)
        t0 = time.time()
        try:
            r = requests.get(url, timeout=30,
                             headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
        except Exception as e:
            print(f"FAILED: {e}")
            return pd.DataFrame()
        print(f"{len(r.content)//1024} KB in {time.time()-t0:.1f}s")
        with open(cache, "wb") as f:
            f.write(r.content)
        raw = pd.read_excel(io.BytesIO(r.content), header=0)

    return raw


def parse_sbro(raw: pd.DataFrame, season: int) -> pd.DataFrame:
    """
    Parse SBRO raw Excel into one-row-per-game with team codes and closing ML.

    SBRO format (MLB):
      Columns: Date | Rot | VH | Team | 1st|2nd|3rd|4th|5th|6th|7th|8th|9th | Final | Open | Close | ML
      VH: V=visiting(away), H=home
      Rows paired: away row immediately followed by home row (same game)
    """
    if raw is None or len(raw) == 0:
        return pd.DataFrame()

    # Normalize column names
    raw.columns = [str(c).strip().lower().replace(" ", "_") for c in raw.columns]

    # Identify key columns
    col_vh    = next((c for c in raw.columns if c in ("vh",)), None)
    col_team  = next((c for c in raw.columns if "team" in c), None)
    col_date  = next((c for c in raw.columns if "date" in c), None)
    col_close = next((c for c in raw.columns if "close" in c), None)
    col_open  = next((c for c in raw.columns if c == "open"), None)
    col_final = next((c for c in raw.columns if "final" in c), None)

    if not all([col_vh, col_team, col_date, col_close]):
        print(f"    WARNING: unexpected SBRO columns: {list(raw.columns)[:10]}")
        return pd.DataFrame()

    records = []
    rows = raw.dropna(subset=[col_team]).reset_index(drop=True)

    i = 0
    while i < len(rows) - 1:
        away_row = rows.iloc[i]
        home_row = rows.iloc[i + 1]

        # Validate VH pairing
        vh_a = str(away_row.get(col_vh, "")).strip().upper()
        vh_h = str(home_row.get(col_vh, "")).strip().upper()

        if vh_a not in ("V", "A") or vh_h not in ("H",):
            i += 1
            continue

        # Parse date
        try:
            raw_date = str(away_row[col_date]).strip()
            # SBRO format: 521 = May 21, 1020 = October 20 (no year, use season)
            if len(raw_date) <= 4 and raw_date.isdigit():
                month = int(raw_date[:-2]) if len(raw_date) > 2 else int(raw_date[0])
                day   = int(raw_date[-2:])
                game_date = pd.Timestamp(season, month, day).date()
            else:
                game_date = pd.to_datetime(raw_date).date()
        except Exception:
            i += 2
            continue

        # Map team names
        away_name = str(away_row[col_team]).strip()
        home_name = str(home_row[col_team]).strip()
        away_code = _match_team(away_name)
        home_code = _match_team(home_name)

        if away_code is None or home_code is None:
            i += 2
            continue

        # Closing ML (what we want for betting EV)
        try:
            away_close = _parse_ml(away_row[col_close])
            home_close = _parse_ml(home_row[col_close])
        except Exception:
            away_close = np.nan
            home_close = np.nan

        # Opening ML
        try:
            away_open = _parse_ml(away_row.get(col_open, np.nan))
            home_open = _parse_ml(home_row.get(col_open, np.nan))
        except Exception:
            away_open = np.nan
            home_open = np.nan

        # Final scores
        try:
            away_score = int(float(away_row.get(col_final, np.nan)))
            home_score = int(float(home_row.get(col_final, np.nan)))
        except Exception:
            away_score = np.nan
            home_score = np.nan

        records.append({
            "game_date":       game_date,
            "season":          season,
            "away_team":       away_code,
            "home_team":       home_code,
            "away_close_ml":   away_close,
            "home_close_ml":   home_close,
            "away_open_ml":    away_open,
            "home_open_ml":    home_open,
            "sbro_away_score": away_score,
            "sbro_home_score": home_score,
        })
        i += 2

    return pd.DataFrame(records)


def _parse_ml(val) -> float:
    """Parse American moneyline value. Handles NaN, 'pk', strings."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return np.nan
    s = str(val).strip().replace(",", "").upper()
    if s in ("", "NAN", "PK", "EVEN"):
        return -110.0  # pick'em = roughly -110
    try:
        return float(s)
    except ValueError:
        return np.nan


def _match_team(name: str):
    """Fuzzy match SBRO team name to our team code."""
    name = name.strip()
    # Direct map
    if name in SBRO_TEAM_MAP:
        return SBRO_TEAM_MAP[name]
    # Partial match (last word = nickname)
    parts = name.split()
    if parts:
        nickname = parts[-1]
        if nickname in SBRO_TEAM_MAP:
            return SBRO_TEAM_MAP[nickname]
        # Try first word (city)
        for key, code in SBRO_TEAM_MAP.items():
            if name.lower() in key.lower() or key.lower() in name.lower():
                return code
    return None


def merge_with_games(odds_df: pd.DataFrame) -> pd.DataFrame:
    """
    Left-join odds onto the real games dataset.
    Match key: game_date + home_team + away_team.
    """
    if not REAL_GAMES_PATH.exists():
        print("ERROR: mlb_games_real.parquet not found. Run build_real_dataset_v4.py first.")
        sys.exit(1)

    games = pd.read_parquet(REAL_GAMES_PATH)
    games["game_date"] = pd.to_datetime(games["game_date"]).dt.date
    odds_df["game_date"] = pd.to_datetime(odds_df["game_date"]).dt.date

    merged = games.merge(
        odds_df[["game_date","home_team","away_team",
                 "home_close_ml","away_close_ml",
                 "home_open_ml","away_open_ml"]],
        on=["game_date","home_team","away_team"],
        how="left",
    )

    match_n   = merged["home_close_ml"].notna().sum()
    match_pct = match_n / len(merged) * 100
    print(f"\n  Merge stats:")
    print(f"    Games in dataset : {len(merged):,}")
    print(f"    Odds matched     : {match_n:,}  ({match_pct:.1f}%)")
    print(f"    Missing odds     : {len(merged)-match_n:,}  (will use prob-derived fallback)")

    return merged


def validate_odds(df: pd.DataFrame):
    """Sanity checks on the odds data."""
    print("\n-- ODDS VALIDATION --")
    with_odds = df[df["home_close_ml"].notna()]
    if len(with_odds) == 0:
        print("  WARNING: No odds matched.")
        return

    # Home team is favored when ML < 0
    home_fav = (with_odds["home_close_ml"] < 0).mean()
    print(f"  Home team favored  : {home_fav:.1%}  (expected ~53-55%)")

    # Implied prob from closing ML
    def ml_to_implied(ml):
        ml = np.array(ml, dtype=float)
        result = np.where(ml < 0, np.abs(ml) / (np.abs(ml) + 100),
                          100 / (ml + 100))
        return result

    home_implied = ml_to_implied(with_odds["home_close_ml"].values)
    away_implied = ml_to_implied(with_odds["away_close_ml"].values)
    vig = home_implied + away_implied - 1.0
    print(f"  Avg implied home   : {home_implied.mean():.3f}")
    print(f"  Avg implied away   : {away_implied.mean():.3f}")
    print(f"  Avg vig (overround): {vig.mean():.3f}  (expected ~0.04-0.08)")

    # Home win rate vs ML prediction
    home_ml_predicted_win = with_odds["home_close_ml"] < 0
    home_actual_win       = with_odds["home_win"].astype(bool)
    ml_accuracy = (home_ml_predicted_win == home_actual_win).mean()
    print(f"  Vegas ML accuracy  : {ml_accuracy:.3f}  (expected ~0.53-0.56)")

    # Range check
    print(f"  ML range           : {with_odds['home_close_ml'].min():.0f} to {with_odds['home_close_ml'].max():.0f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MoSport v4.0.1 Vegas Odds Ingestion")
    parser.add_argument("--seasons", nargs="+", type=int, default=[2021,2022,2023,2024])
    parser.add_argument("--force",   action="store_true", help="Re-download even if cached")
    args = parser.parse_args()

    print("=" * 60)
    print("  MoSport v4.0.1 -- Vegas Closing Odds Ingestion")
    print("  Source: Sportsbookreviewsonline.com (SBRO)")
    print("  Metric: Closing Moneyline (most predictive Vegas line)")
    print("=" * 60)

    REAL_GAMES_DIR.mkdir(parents=True, exist_ok=True)
    all_odds = []

    for season in args.seasons:
        print(f"\n  Season {season}:")
        raw = download_sbro(season, force=args.force)
        if raw is None or len(raw) == 0:
            print(f"    SKIP: no data for {season}")
            continue

        parsed = parse_sbro(raw, season)
        if len(parsed) == 0:
            print(f"    SKIP: parse returned 0 rows for {season}")
            continue

        print(f"    Parsed {len(parsed):,} games from SBRO")
        all_odds.append(parsed)

    if not all_odds:
        print("\nERROR: No odds data parsed. Check SBRO availability.")
        sys.exit(1)

    odds_df = pd.concat(all_odds, ignore_index=True)
    odds_df = odds_df.drop_duplicates(["game_date","home_team","away_team"])
    odds_df.to_parquet(ODDS_PATH, index=False)
    print(f"\n[SAVED] {ODDS_PATH}  ({len(odds_df):,} games with odds)")

    # Merge with game dataset
    print("\n-- MERGING WITH GAME DATASET --")
    merged = merge_with_games(odds_df)
    merged.to_parquet(MERGED_PATH, index=False)
    print(f"[SAVED] {MERGED_PATH}")

    validate_odds(merged)

    print("\n[DONE] Run mlb_backtest_v4_1.py to use real closing odds in ROI engine.")
