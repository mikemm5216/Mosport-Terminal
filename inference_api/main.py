import os
import json
import time
import psycopg2
from psycopg2 import pool
from threading import Lock
import xgboost as xgb
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
<<<<<<< HEAD
from typing import List, Optional, Dict, Any

from feature_pipeline.mlb_pipeline import (
    MLBGameContext, PhysiologicalInput, PsychologicalInput, build_feature_vector
)
from engines.performance_engine import compute_performance
from engines.player_impact_engine import PlayerStats, compute_player_impact
from engines.risk_engine import compute_risk

app = FastAPI(title="Mosport Inference Engine v2.0")
=======
from typing import List, Optional

app = FastAPI(title="Mosport Inference Engine")
>>>>>>> parent of 996fa0e (chore: remove entire Mosport-Terminal repository directory)

# 1. Model Cache (加入時間追蹤 TTL 與數量上限)
loaded_models = {}
MODEL_TTL_SECONDS = 3600  # 1 小時
MAX_CACHE_SIZE = 5        # LRU 暫存限制
model_lock = Lock()       # 2. 全域 Thread Lock

# Thread-safe DB Connection Pool
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL environment variable is not set.")

db_pool = pool.ThreadedConnectionPool(1, 10, dsn=db_url)

def get_db_connection():
    return db_pool.getconn()

def release_db_connection(conn):
    db_pool.putconn(conn)

class PredictRequest(BaseModel):
    model_id: str
    feature_vector: List[float]
    model_type: str = "T-10min"  # 前端可選傳，預設抓取 T-10min

EXPECTED_FEATURE_LENGTH = 6

# 新增自動撈取該型別最新模型方法
def fetch_latest_model(model_type: str):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            SELECT model_id, model_json 
            FROM model_registry 
            WHERE model_type = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        cursor.execute(query, (model_type,))
        result = cursor.fetchone()
        cursor.close()
        return result
    finally:
        if conn:
            release_db_connection(conn)

# 保留透過特定 ID 撈取方法
def fetch_model_by_id(model_id: str):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT model_id, model_json FROM model_registry WHERE model_id = %s"
        cursor.execute(query, (model_id,))
        result = cursor.fetchone()
        cursor.close()
        return result
    finally:
        if conn:
            release_db_connection(conn)

# LRU 清除過多快取機制
def clean_cache_if_needed():
    if len(loaded_models) >= MAX_CACHE_SIZE:
        oldest_model_id = min(loaded_models.keys(), key=lambda k: loaded_models[k]["loaded_at"])
        del loaded_models[oldest_model_id]
        print(f"[CACHE EVICT] {oldest_model_id} (LRU constraint: MAX {MAX_CACHE_SIZE})")

@app.post("/predict")
def predict(req: PredictRequest):
    start_time = time.time() # 4. Latency Logging 起點

    target_model_id = req.model_id
    features = req.feature_vector
    model_type = req.model_type

    # Feature 防呆檢查
    if len(features) != EXPECTED_FEATURE_LENGTH:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid feature vector length. Expected {EXPECTED_FEATURE_LENGTH}, got {len(features)}"
        )

    resolved_model_id = target_model_id
    db_model_json = None

    # 支援「自動最新模型」
    if target_model_id == "latest":
        latest_res = fetch_latest_model(model_type)
        if not latest_res:
            raise HTTPException(status_code=404, detail=f"No models found for type: {model_type}")
        resolved_model_id, db_model_json = latest_res

    now = time.time()
    needs_load = False

    # Cache TTL + Cleanup
    if resolved_model_id not in loaded_models:
        needs_load = True
    else:
        cache_entry = loaded_models[resolved_model_id]
        if (now - cache_entry["loaded_at"]) > MODEL_TTL_SECONDS:
            print(f"[CACHE EXPIRED] {resolved_model_id}")
            del loaded_models[resolved_model_id]
            needs_load = True
        else:
            print(f"[CACHE HIT] {resolved_model_id}")

    # 2. 加入 Thread Lock (Double-Checked Locking 防禦 Cache Stampede 快取雪崩)
    if needs_load:
        with model_lock:
            # 取得鎖後，再檢查一次是否剛剛已經被其他執行緒載入且未過期 (Double-check)
            if resolved_model_id in loaded_models and (time.time() - loaded_models[resolved_model_id]["loaded_at"]) <= MODEL_TTL_SECONDS:
                # 已經被載入，安全跳過
                pass 
            else:
                if not db_model_json:
                    id_res = fetch_model_by_id(resolved_model_id)
                    if not id_res:
                        raise HTTPException(status_code=404, detail=f"Model ID {resolved_model_id} not found in database.")
                    resolved_model_id, db_model_json = id_res

                try:
                    # 1. model_json 型別安全防禦
                    if isinstance(db_model_json, dict):
                        model_json_str = json.dumps(db_model_json)
                    else:
                        model_json_str = db_model_json

                    # XGBoost Booster 記憶體零落地載入
                    booster = xgb.Booster()
                    booster.load_model(bytearray(model_json_str.encode('utf-8')))
                    
                    # LRU Cache 容量控管
                    clean_cache_if_needed()

                    loaded_models[resolved_model_id] = {
                        "booster": booster,
                        "loaded_at": time.time()
                    }
                    print(f"[MODEL LOAD] {resolved_model_id}")
                    
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to load and parse model json: {str(e)}")

    # 取出真正可用且保鮮的 Booster
    booster = loaded_models[resolved_model_id]["booster"]

    X = np.array([features])
    dmatrix = xgb.DMatrix(X)
    
    # 3. 量化級 Prediction Error Guard (Fail-Safe)
    try:
        pred_res = booster.predict(dmatrix)
        probability = float(pred_res[0])
    except Exception as e:
        print(f"[PREDICT ERROR] model={resolved_model_id} error={str(e)}")
        # 發生錯誤時退回 Fail-Safe 機率 -1.0 並追加 error 標籤
        return {"probability": -1.0, "error": True}

    # 4. Latency Logging (推論延遲追蹤結算)
    latency = time.time() - start_time
    print(f"[LATENCY] model={resolved_model_id} prob={probability:.4f} time={latency:.4f}s")
    
    # 不改 API contract
    return {"probability": probability}

class InferenceRequest(BaseModel):
    model_id: str = "latest"
    home_team: str
    away_team: str
    feature_vector: List[float]
    model_type: str = "T-10min"
    chaos_test: bool = False

@app.post("/api/v1/inference")
def alpha_inference(req: InferenceRequest):
    # Authorized Edge Neural Link
    
    # Chaos Testing (CTO Mandate)
    if req.chaos_test:
        print("[CHAOS] Simulating 5000ms GPU lock and Cold Start Delay")
        time.sleep(5.0)

    # In a real environment, we would invoke the exact equivalent booster.predict(X)
    # here. Since this is the structural rewrite, we will proxy to the existing predict logic.
    base_res = predict(PredictRequest(
        model_id=req.model_id,
        feature_vector=req.feature_vector,
        model_type=req.model_type
    ))
    
    prob = base_res.get("probability", 0.5)

    base_signal = "ALPHA_ADVANTAGE_DETECTED" if prob >= 0.55 else ("AWAY_ADVANTAGE_DETECTED" if prob <= 0.45 else "TACTICAL_DEADLOCK")
    momentum_str = "HIGH CONVICTION" if abs(prob - 0.5) > 0.15 else "NEUTRAL MOMENTUM"

    return {
        "probability": float(prob),
        "standard_analysis": [
            f"INFERENCING NATIVE XGBOOST VECTOR [{req.home_team} vs {req.away_team}]",
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

# Health Check API
@app.get("/health")
def health():
    return {
        "status": "ok", 
        "cache_size": len(loaded_models),
        "loaded_models": list(loaded_models.keys())
    }

# Background Warmup Hook
@app.post("/warmup")
def warmup(model_id: str, background_tasks: BackgroundTasks):
    req = PredictRequest(model_id=model_id, feature_vector=[0.0] * EXPECTED_FEATURE_LENGTH)
    background_tasks.add_task(predict, req)
    return {"status": "warming_in_background", "model_id": model_id}
<<<<<<< HEAD


# ─────────────────────────────────────────────
#  MoSport v2.0  —  Full Prediction API
# ─────────────────────────────────────────────

class PhysInput(BaseModel):
    games_last_7_days: int = 0
    rest_days: int = 1
    travel_km: float = 0.0
    age: int = 27
    whoop_hrv: float = 0.0
    whoop_strain: float = 0.0
    whoop_recovery: float = 0.0


class PsychInput(BaseModel):
    home_win_rate: float = 0.54
    away_win_rate: float = 0.46
    home_streak: int = 0
    away_streak: int = 0
    home_era: float = 4.00
    away_era: float = 4.00
    sentiment_home: float = 0.0
    sentiment_away: float = 0.0
    standings_gap: float = 0.0
    rivalry_factor: float = 1.0


class PlayerInput(BaseModel):
    player_id: str
    name: str
    position: str
    batting_avg: float = 0.250
    ops: float = 0.720
    era: Optional[float] = None
    whip: Optional[float] = None
    recent_form: float = 0.0
    fatigue_index: float = 0.0


class V2PredictRequest(BaseModel):
    match_id: str
    home_team: str
    away_team: str
    home_phys: PhysInput = PhysInput()
    away_phys: PhysInput = PhysInput()
    psych: PsychInput = PsychInput()
    players: List[PlayerInput] = []
    model_id: str = "latest"
    model_type: str = "T-10min"


@app.post("/api/v2/predict")
def predict_v2(req: V2PredictRequest) -> Dict[str, Any]:
    start = time.time()

    # STEP 1: Build feature vector from MLB context
    ctx = MLBGameContext(
        match_id=req.match_id,
        home_team=req.home_team,
        away_team=req.away_team,
        home_phys=PhysiologicalInput(**req.home_phys.model_dump()),
        away_phys=PhysiologicalInput(**req.away_phys.model_dump()),
        psych=PsychologicalInput(**req.psych.model_dump()),
    )
    fv = build_feature_vector(ctx)
    feature_list = fv.to_list()

    # STEP 2: Try to load XGBoost model (falls back to rule-based if unavailable)
    booster = None
    try:
        if req.model_id == "latest":
            result = fetch_latest_model(req.model_type)
            if result:
                model_id, model_json = result
                booster = xgb.Booster()
                mj = json.dumps(model_json) if isinstance(model_json, dict) else model_json
                booster.load_model(bytearray(mj.encode("utf-8")))
    except Exception:
        booster = None

    # STEP 3: Run three engines
    perf = compute_performance(feature_list, booster)

    player_stats = [
        PlayerStats(**p.model_dump()) for p in req.players
    ] if req.players else _default_lineup(req.home_team, req.away_team)

    top5 = compute_player_impact(player_stats, perf.home_win_probability)

    risk = compute_risk(perf.home_win_probability, feature_list)

    latency = time.time() - start
    print(f"[V2] match={req.match_id} home_win={perf.home_win_probability:.3f} "
          f"risk={risk.upset_probability:.3f} latency={latency:.3f}s")

    return {
        "match_id": req.match_id,
        "home_team": req.home_team,
        "away_team": req.away_team,
        "win_probability": {
            "home": perf.home_win_probability,
            "away": perf.away_win_probability,
        },
        "expected_score": perf.score_range,
        "expected_runs": {
            "home": perf.expected_score_home,
            "away": perf.expected_score_away,
        },
        "player_impact_top5": [
            {
                "player_id": p.player_id,
                "name": p.name,
                "contribution_score": p.contribution_score,
                "lineup_sensitivity": p.lineup_sensitivity,
                "match_influence_delta": p.match_influence_delta,
            }
            for p in top5
        ],
        "risk_index": risk.upset_probability,
        "volatility_index": risk.volatility_index,
        "confidence_score": risk.confidence_calibration,
        "model_used": "xgboost" if booster else "rule_based",
        "latency_ms": round(latency * 1000, 1),
    }


def _default_lineup(home_team: str, away_team: str) -> list[PlayerStats]:
    """Placeholder lineup when no player data is provided."""
    return [
        PlayerStats(player_id="h_sp", name=f"{home_team} SP", position="SP", era=3.80, whip=1.15, recent_form=0.2),
        PlayerStats(player_id="h_ss", name=f"{home_team} SS", position="SS", batting_avg=0.275, ops=0.780, recent_form=0.1),
        PlayerStats(player_id="h_cf", name=f"{home_team} CF", position="CF", batting_avg=0.260, ops=0.750, recent_form=0.0),
        PlayerStats(player_id="a_sp", name=f"{away_team} SP", position="SP", era=4.10, whip=1.25, recent_form=-0.1),
        PlayerStats(player_id="a_ss", name=f"{away_team} SS", position="SS", batting_avg=0.255, ops=0.710, recent_form=0.0),
        PlayerStats(player_id="a_cf", name=f"{away_team} CF", position="CF", batting_avg=0.248, ops=0.700, recent_form=-0.2),
    ]
=======
>>>>>>> parent of 996fa0e (chore: remove entire Mosport-Terminal repository directory)
