#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MoSport v4.0 -- Real Data Builder
STEP 1 of 4: Build MLB real game dataset from Baseball Savant / pybaseball

Pulls statcast pitch data (month by month, with caching) and extracts:
  - Game-level results (home_score, away_score, home_win) -- REAL GROUND TRUTH
  - SP metrics (rest days, pitch count, IP) from statcast pitcher_days_since_prev_game
  - Team exit velocity (real Statcast, not proxy)
  - Bullpen usage (non-starter pitchers used per game)

Output: data/real_games/mlb_games_real.parquet
  One row per game. All features computable from public MLB APIs.
  NO synthetic labels. NO random.seed() game simulation.

Data scope:
  TRAINING:  2021-2022 (2 seasons)
  VALIDATE:  2023
  BLIND TEST: 2024 (never touched during training/tuning)

Usage:
  python build_real_dataset_v4.py
  python build_real_dataset_v4.py --seasons 2024      # only pull 2024
  python build_real_dataset_v4.py --force             # re-pull all (ignore cache)
"""

import argparse
import math
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

STATCAST_CACHE_DIR = Path("data/statcast_cache")
REAL_GAMES_DIR     = Path("data/real_games")
REAL_GAMES_PATH    = REAL_GAMES_DIR / "mlb_games_real.parquet"

# Columns we keep from raw statcast (saves disk/memory -- 118 cols -> 14)
KEEP_COLS = [
    "game_pk", "game_date", "home_team", "away_team",
    "post_home_score", "post_away_score",
    "inning", "inning_topbot", "pitcher", "at_bat_number",
    "launch_speed", "launch_angle",
    "pitcher_days_since_prev_game", "events",
]

# MLB regular season months
SEASON_MONTHS = [4, 5, 6, 7, 8, 9]   # April through September

# Standard team code normalization (pybaseball uses these)
# Some older data uses different abbreviations
TEAM_NORM = {
    "TB":  "TBR", "TBD": "TBR",
    "KC":  "KCR",
    "SD":  "SDP",
    "SF":  "SFG",
    "WSH": "WSN", "WAS": "WSN",
    "CWS": "CWS",
    "LA":  "LAD",
}

def normalize_team(code: str) -> str:
    if code is None: return "UNK"
    return TEAM_NORM.get(str(code).upper(), str(code).upper())


def pull_statcast_month(season: int, month: int,
                         force: bool = False) -> Optional[pd.DataFrame]:
    """
    Pull one month of statcast data. Caches to statcast_cache/.
    Returns None on failure.
    """
    cache_path = STATCAST_CACHE_DIR / f"statcast_{season}_{month:02d}.parquet"

    if cache_path.exists() and not force:
        print(f"    [cache] {cache_path.name}")
        df = pd.read_parquet(cache_path, columns=[c for c in KEEP_COLS
                                                   if c in pd.read_parquet(cache_path,
                                                   columns=["game_pk"]).columns
                                                   or True])
        # Read only needed columns if present
        try:
            df = pd.read_parquet(cache_path, columns=KEEP_COLS)
        except Exception:
            df = pd.read_parquet(cache_path)
            avail = [c for c in KEEP_COLS if c in df.columns]
            df = df[avail]
        return df

    # Pull from pybaseball
    try:
        from pybaseball import statcast
        import calendar
        last_day = calendar.monthrange(season, month)[1]
        start = f"{season}-{month:02d}-01"
        end   = f"{season}-{month:02d}-{last_day}"
        print(f"    [pull] {start} -> {end} ...", end=" ", flush=True)
        t0 = time.time()
        df = statcast(start_dt=start, end_dt=end)
        elapsed = time.time() - t0
        if df is None or len(df) == 0:
            print(f"empty (skipped)")
            return None
        print(f"{len(df):,} pitches in {elapsed:.0f}s")

        # Save full data to cache
        STATCAST_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        df.to_parquet(cache_path, index=False)

        # Return only needed cols
        avail = [c for c in KEEP_COLS if c in df.columns]
        return df[avail]

    except Exception as e:
        print(f"FAILED: {e}")
        return None


def extract_game_summaries(df: pd.DataFrame) -> pd.DataFrame:
    """
    From pitch-level statcast data, extract one row per game.
    All values derived strictly from real observed data.
    """
    if df is None or len(df) == 0:
        return pd.DataFrame()

    # Ensure dtypes
    df = df.copy()
    df["game_date"] = pd.to_datetime(df["game_date"]).dt.date
    df["launch_speed"] = pd.to_numeric(df["launch_speed"], errors="coerce")
    df["pitcher_days_since_prev_game"] = pd.to_numeric(
        df["pitcher_days_since_prev_game"], errors="coerce")
    df["post_home_score"] = pd.to_numeric(df["post_home_score"], errors="coerce")
    df["post_away_score"] = pd.to_numeric(df["post_away_score"], errors="coerce")

    summaries = []

    for game_pk, g in df.groupby("game_pk"):
        try:
            # ── Scores ─────────────────────────────────────────────
            home_score = int(g["post_home_score"].max())
            away_score = int(g["post_away_score"].max())
            if home_score == away_score:
                continue  # skip ties (rare, usually incomplete data)
            home_win = 1 if home_score > away_score else 0

            # ── Team IDs ────────────────────────────────────────────
            home_team = normalize_team(g["home_team"].iloc[0])
            away_team = normalize_team(g["away_team"].iloc[0])
            game_date = g["game_date"].iloc[0]

            # ── Exit Velocity (by batting team) ─────────────────────
            # Top inning = away team batting, Bot inning = home team batting
            batted = g[g["launch_speed"].notna()]
            home_ev = batted[batted["inning_topbot"] == "Bot"]["launch_speed"].mean()
            away_ev = batted[batted["inning_topbot"] == "Top"]["launch_speed"].mean()

            # ── Starting Pitcher (first pitcher per team) ────────────
            # Home SP = first pitcher to appear in Bottom innings (pitching to away batters)
            # Wait: home pitcher pitches in Top innings (when away team bats)
            # Away pitcher pitches in Bot innings (when home team bats)
            home_pitching_df = g[g["inning_topbot"] == "Top"]  # home pitches in Top
            away_pitching_df = g[g["inning_topbot"] == "Bot"]  # away pitches in Bot

            def get_starter(pitch_df):
                if pitch_df.empty:
                    return None, np.nan, 0
                # Starter = pitcher with lowest at_bat_number start
                try:
                    ab_first = pitch_df.groupby("pitcher")["at_bat_number"].min()
                    sp_id = int(ab_first.idxmin())
                    sp_df = pitch_df[pitch_df["pitcher"] == sp_id]
                    sp_rest = float(sp_df["pitcher_days_since_prev_game"].median())
                    sp_pitches = len(sp_df)
                except Exception:
                    return None, np.nan, 0
                return sp_id, sp_rest, sp_pitches

            home_sp_id, home_sp_rest, home_sp_pc = get_starter(home_pitching_df)
            away_sp_id, away_sp_rest, away_sp_pc = get_starter(away_pitching_df)

            # ── Bullpen Usage (non-starter pitchers) ─────────────────
            home_all_pitchers = set(home_pitching_df["pitcher"].unique())
            away_all_pitchers = set(away_pitching_df["pitcher"].unique())
            home_bp_n = len(home_all_pitchers - {home_sp_id})
            away_bp_n = len(away_all_pitchers - {away_sp_id})

            # ── Strikeout proxy (K rate for pitching team) ───────────
            home_k = (home_pitching_df["events"] == "strikeout").sum()
            away_k = (away_pitching_df["events"] == "strikeout").sum()
            home_bb = (home_pitching_df["events"] == "walk").sum()
            away_bb = (away_pitching_df["events"] == "walk").sum()

            summaries.append({
                "game_pk":       game_pk,
                "game_date":     game_date,
                "home_team":     home_team,
                "away_team":     away_team,
                "home_score":    home_score,
                "away_score":    away_score,
                "home_win":      home_win,
                "run_diff":      home_score - away_score,
                "home_ev":       round(home_ev, 3) if not np.isnan(home_ev) else np.nan,
                "away_ev":       round(away_ev, 3) if not np.isnan(away_ev) else np.nan,
                "home_sp_id":    home_sp_id,
                "away_sp_id":    away_sp_id,
                "home_sp_rest":  round(home_sp_rest, 1),
                "away_sp_rest":  round(away_sp_rest, 1),
                "home_sp_pc":    home_sp_pc,    # pitch count
                "away_sp_pc":    away_sp_pc,
                "home_bp_n":     home_bp_n,     # bullpen pitchers used
                "away_bp_n":     away_bp_n,
                "home_k":        home_k,        # strikeouts thrown by home pitchers
                "away_k":        away_k,
                "home_bb":       home_bb,
                "away_bb":       away_bb,
            })

        except Exception as e:
            continue  # skip malformed games

    return pd.DataFrame(summaries)


def build_dataset(seasons: List[int], months: List[int] = SEASON_MONTHS,
                  force: bool = False) -> pd.DataFrame:
    """
    Main data builder. Pulls and extracts game summaries for all season/months.
    Returns combined DataFrame with all real game results.
    """
    REAL_GAMES_DIR.mkdir(parents=True, exist_ok=True)
    all_games = []

    for season in seasons:
        print(f"\n  Season {season}:")
        season_games = []

        for month in months:
            game_cache = REAL_GAMES_DIR / f"games_{season}_{month:02d}.parquet"

            if game_cache.exists() and not force:
                print(f"    [game cache] games_{season}_{month:02d}.parquet")
                gdf = pd.read_parquet(game_cache)
            else:
                df_raw = pull_statcast_month(season, month, force=force)
                if df_raw is None or len(df_raw) == 0:
                    continue
                gdf = extract_game_summaries(df_raw)
                if len(gdf) > 0:
                    gdf.to_parquet(game_cache, index=False)
                    print(f"    [extracted] {len(gdf)} games")

            if len(gdf) > 0:
                gdf["season"] = season
                season_games.append(gdf)

        if season_games:
            sdf = pd.concat(season_games, ignore_index=True)
            sdf = sdf.drop_duplicates("game_pk")
            sdf = sdf.sort_values("game_date").reset_index(drop=True)
            print(f"  -> {len(sdf)} unique games in {season}")
            all_games.append(sdf)

    if not all_games:
        print("ERROR: No game data extracted.")
        return pd.DataFrame()

    combined = pd.concat(all_games, ignore_index=True)
    combined = combined.drop_duplicates("game_pk").sort_values("game_date").reset_index(drop=True)

    # Save master file
    combined.to_parquet(REAL_GAMES_PATH, index=False)
    print(f"\n[SAVED] {REAL_GAMES_PATH}  ({len(combined):,} total games)")

    return combined


def validate_dataset(df: pd.DataFrame):
    """Sanity checks on the real game dataset."""
    print("\n-- DATASET VALIDATION --")
    print(f"  Total games    : {len(df):,}")
    print(f"  Date range     : {df.game_date.min()} -> {df.game_date.max()}")
    print(f"  Home win rate  : {df.home_win.mean():.3f}  (expected ~0.535-0.545)")
    print(f"  Avg score home : {df.home_score.mean():.2f}")
    print(f"  Avg score away : {df.away_score.mean():.2f}")
    print(f"  Seasons        : {sorted(df.season.unique())}")

    print(f"\n  Games per season:")
    for s, n in df.groupby("season").size().items():
        print(f"    {s}: {n:,} games")

    print(f"\n  Missing values (key cols):")
    for col in ["home_ev","away_ev","home_sp_rest","away_sp_rest","home_sp_pc"]:
        pct = df[col].isna().mean() * 100
        print(f"    {col:<20}: {pct:.1f}% missing")

    wr = df.home_win.mean()
    if not (0.51 <= wr <= 0.57):
        print(f"\n  WARNING: home win rate {wr:.3f} outside expected range [0.51, 0.57]")
    else:
        print(f"\n  [OK] Home win rate plausible: {wr:.3f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MoSport v4.0 Real Data Builder")
    parser.add_argument("--seasons", nargs="+", type=int,
                        default=[2021, 2022, 2023, 2024],
                        help="Seasons to pull (default: 2021-2024)")
    parser.add_argument("--months", nargs="+", type=int,
                        default=SEASON_MONTHS,
                        help="Months to pull (default: 4-9)")
    parser.add_argument("--force", action="store_true",
                        help="Re-pull even if cached")
    args = parser.parse_args()

    print("=" * 60)
    print("  MoSport v4.0 -- Real Data Builder")
    print("  Source: Baseball Savant (via pybaseball statcast)")
    print("  NO synthetic labels. Ground truth only.")
    print("=" * 60)
    print(f"\n  Seasons : {args.seasons}")
    print(f"  Months  : {args.months}")

    df = build_dataset(args.seasons, args.months, force=args.force)

    if len(df) > 0:
        validate_dataset(df)
        print("\n[DONE] Real dataset ready for mlb_backtest_v4_0.py")
    else:
        print("\n[ERROR] Dataset build failed. Check API access.")
        sys.exit(1)
