from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import time
import random

app = FastAPI(title="Mosport Mock Inference Engine")

class InferenceRequest(BaseModel):
    model_id: str = "latest"
    home_team: str
    away_team: str
    feature_vector: List[float]
    model_type: str = "T-10min"
    chaos_test: bool = False

@app.post("/api/v1/inference")
def alpha_inference(req: InferenceRequest):
    if req.chaos_test:
        time.sleep(5.0)

    # DYNAMIC: random probability between 0.30 and 0.70 so the tug-of-war bar is never static
    prob = round(random.uniform(0.30, 0.70), 4)

    if prob >= 0.55:
        base_signal = "ALPHA_ADVANTAGE_DETECTED"
        momentum_str = "HIGH CONVICTION" if prob >= 0.62 else "MODERATE EDGE"
    elif prob <= 0.45:
        base_signal = "AWAY_ADVANTAGE_DETECTED"
        momentum_str = "HIGH CONVICTION" if prob <= 0.38 else "MODERATE EDGE"
    else:
        base_signal = "TACTICAL_DEADLOCK"
        momentum_str = "NEUTRAL MOMENTUM"

    return {
        "probability": prob,
        "standard_analysis": [
            f"INFERENCING MOCK XGBOOST VECTOR [{req.home_team} vs {req.away_team}]",
            f"EDGE COMPUTATION RESOLVED WITH {(prob * 100):.1f}% CONFIDENCE",
            f"ALPHA ALIGNMENT: {base_signal}"
        ],
        "tactical_matchup": [
            f"COMPUTING SQUAD DEPTH FOR {req.home_team} / {req.away_team}...",
            "READING TRANSITION STATES FROM LATEST BOXSCORE...",
            f"EDGE CALIBRATION {momentum_str}"
        ],
        "x_factors": [
            base_signal,
            "MOMENTUM CONSTRAINTS APPLIED BY FASTAPI",
            "OUTLIER IDENTIFICATION NEURAL LINK ACTIVE"
        ]
    }

@app.get("/health")
def health():
    return {"status": "ok_mock", "mode": "dynamic_random"}
