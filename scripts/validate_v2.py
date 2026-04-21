"""
MoSport v2.0 Validation Script — STEP 4

Produces three reports:
  A. Accuracy Report     — overall + per-team breakdown
  B. Calibration Curve   — confidence vs real outcome
  C. Upset Analysis      — underdog win detection rate
"""

import os
import sys
import json
import psycopg2
import pandas as pd
import numpy as np
import requests
from sklearn.metrics import accuracy_score, log_loss
from sklearn.calibration import calibration_curve

BASE_URL = os.environ.get("MOSPORT_API_URL", "http://localhost:8000")
DB_URL   = os.environ.get("DATABASE_URL", "")
TOP_N_UPSET_THRESHOLD = 0.40  # favorite win prob below this = upset if underdog wins


def fetch_historical_matches(conn) -> pd.DataFrame:
    """Pull completed MLB matches with known outcomes."""
    query = """
        SELECT
            match_id,
            home_team,
            away_team,
            home_score,
            away_score,
            match_date
        FROM "Matches"
        WHERE sport = 'MLB'
          AND status = 'completed'
          AND home_score IS NOT NULL
          AND away_score IS NOT NULL
        ORDER BY match_date ASC
    """
    df = pd.read_sql_query(query, conn)
    df["home_win"] = (df["home_score"] > df["away_score"]).astype(int)
    return df


def call_predict_v2(row: pd.Series) -> dict:
    payload = {
        "match_id": str(row["match_id"]),
        "home_team": row["home_team"],
        "away_team": row["away_team"],
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/v2/predict", json=payload, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


# ─── Report A: Accuracy ────────────────────────────────────────────────────────

def report_accuracy(df: pd.DataFrame, predictions: list[dict]) -> dict:
    y_true, y_pred, teams = [], [], []

    for i, pred in enumerate(predictions):
        if "error" in pred:
            continue
        row = df.iloc[i]
        prob_home = pred["win_probability"]["home"]
        predicted = 1 if prob_home >= 0.5 else 0
        y_true.append(row["home_win"])
        y_pred.append(predicted)
        teams.append(row["home_team"])

    if not y_true:
        return {"error": "no valid predictions"}

    overall = accuracy_score(y_true, y_pred)

    per_team = {}
    team_arr = np.array(teams)
    yt = np.array(y_true)
    yp = np.array(y_pred)
    for team in np.unique(team_arr):
        mask = team_arr == team
        if mask.sum() >= 5:
            per_team[team] = round(accuracy_score(yt[mask], yp[mask]), 4)

    return {
        "overall_accuracy": round(overall, 4),
        "sample_size": len(y_true),
        "per_team_accuracy": per_team,
        "target_met_60pct": overall >= 0.60,
        "target_met_65pct": overall >= 0.65,
    }


# ─── Report B: Calibration ────────────────────────────────────────────────────

def report_calibration(df: pd.DataFrame, predictions: list[dict]) -> dict:
    y_true, y_prob = [], []

    for i, pred in enumerate(predictions):
        if "error" in pred:
            continue
        row = df.iloc[i]
        y_true.append(row["home_win"])
        y_prob.append(pred["win_probability"]["home"])

    if len(y_true) < 20:
        return {"error": "insufficient data for calibration curve"}

    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=10)
    ece = float(np.mean(np.abs(prob_true - prob_pred)))
    ll  = log_loss(y_true, y_prob)

    bins = [
        {"predicted": round(float(pp), 3), "actual": round(float(pt), 3)}
        for pp, pt in zip(prob_pred, prob_true)
    ]

    return {
        "expected_calibration_error": round(ece, 4),
        "log_loss": round(ll, 4),
        "calibration_bins": bins,
        "well_calibrated": ece < 0.05,
    }


# ─── Report C: Upset Analysis ────────────────────────────────────────────────

def report_upset(df: pd.DataFrame, predictions: list[dict]) -> dict:
    upsets_actual = 0
    upsets_detected = 0
    total_games = 0

    for i, pred in enumerate(predictions):
        if "error" in pred:
            continue
        row = df.iloc[i]
        home_win_prob = pred["win_probability"]["home"]
        risk_index    = pred.get("risk_index", 0.5)
        actual_home_win = row["home_win"]

        total_games += 1

        favorite_won = (
            (home_win_prob >= 0.5 and actual_home_win == 1) or
            (home_win_prob < 0.5 and actual_home_win == 0)
        )
        if not favorite_won:
            upsets_actual += 1
            if risk_index >= (1.0 - TOP_N_UPSET_THRESHOLD):
                upsets_detected += 1

    actual_rate    = upsets_actual / total_games if total_games else 0
    detection_rate = upsets_detected / upsets_actual if upsets_actual else 0

    return {
        "total_games": total_games,
        "actual_upset_count": upsets_actual,
        "actual_upset_rate": round(actual_rate, 4),
        "detected_upset_count": upsets_detected,
        "upset_detection_rate": round(detection_rate, 4),
        "threshold_used": TOP_N_UPSET_THRESHOLD,
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not DB_URL:
        print("ERROR: DATABASE_URL not set.")
        sys.exit(1)

    print("Connecting to database...")
    conn = psycopg2.connect(DB_URL)

    print("Fetching historical MLB matches...")
    df = fetch_historical_matches(conn)
    conn.close()

    if df.empty:
        print("No completed MLB matches found. Exiting.")
        sys.exit(0)

    print(f"Found {len(df)} matches. Running predictions...")
    predictions = []
    for _, row in df.iterrows():
        pred = call_predict_v2(row)
        predictions.append(pred)

    print("\n" + "=" * 60)
    print("REPORT A — Accuracy")
    print("=" * 60)
    acc = report_accuracy(df, predictions)
    print(json.dumps(acc, indent=2))

    print("\n" + "=" * 60)
    print("REPORT B — Calibration Curve")
    print("=" * 60)
    cal = report_calibration(df, predictions)
    print(json.dumps(cal, indent=2))

    print("\n" + "=" * 60)
    print("REPORT C — Upset Analysis")
    print("=" * 60)
    upset = report_upset(df, predictions)
    print(json.dumps(upset, indent=2))

    output = {"accuracy": acc, "calibration": cal, "upset": upset}
    with open("validation_report_v2.json", "w") as f:
        json.dump(output, f, indent=2)
    print("\nSaved: validation_report_v2.json")


if __name__ == "__main__":
    main()
