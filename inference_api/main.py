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
from typing import List, Optional

app = FastAPI(title="Mosport Inference Engine")

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
