import os
import json
import psycopg2
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, log_loss

def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set in environment.")
        return
    
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(db_url)
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    snapshot_types = ["T-24h", "T-6h", "T-1h", "T-10min"]
    cursor = conn.cursor()
    
    for snapshot_type in snapshot_types:
        print(f"\n--- Training Engine: Model for {snapshot_type} ---")
        
        # 1. 抓取資料並透過 JOIN 取得 match_date 做 Time-Based Split (防止 leakage)
        query = """
            SELECT e.feature_vector, e.label, m.match_date 
            FROM experiences e
            JOIN "Matches" m ON e.match_id = m.match_id
            WHERE e.snapshot_type = %s
            ORDER BY m.match_date ASC
        """
        df = pd.read_sql_query(query, conn, params=(snapshot_type,))
        
        if df.empty or len(df) < 10:
            print(f"Not enough data for {snapshot_type} (got {len(df)} rows). Skipping...")
            continue
            
        print(f"Loaded {len(df)} experiences for {snapshot_type}.")
        
        # 2. X, y Data Prep
        X = pd.DataFrame(df['feature_vector'].to_list())
        y = df['label']
        
        # 3. Time-Based Split: 因為上面 SQL 已經按時序排序，這裡直接切片且不要 shuffle!
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
        print(f"Split -> Train size: {len(X_train)}, Test size: {len(X_test)}")
        
        # 4. Train Model
        print("Training XGBClassifier...")
        model = xgb.XGBClassifier(
            use_label_encoder=False, 
            eval_metric='mlogloss',
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1
        )
        model.fit(X_train, y_train)
        
        # 5. Evaluation Metrics
        pred = model.predict(X_test)
        proba = model.predict_proba(X_test)
        
        # log_loss 預期二維機率矩陣與對應大小
        accuracy = accuracy_score(y_test, pred)
        logloss = log_loss(y_test, proba)
        print(f"Metrics -> Accuracy: {accuracy:.4f}, LogLoss: {logloss:.4f}")
        
        # 6. 將 XGBoost 模型輸出為 JSON 格式準備持久化 DB
        model.save_model("temp_model.json")
        with open("temp_model.json", "r") as f:
            model_json = f.read()
        os.remove("temp_model.json")
        
        metrics_json = json.dumps({
            "accuracy": float(accuracy),
            "logloss": float(logloss),
            "train_size": len(X_train),
            "test_size": len(X_test),
            "label_type": "HOME_WIN" # 如果未來有多種類型，也該從外層帶入
        })
        
        # 7. 存入 ModelRegistry (持久化，不再依賴 ephemeral)
        insert_query = """
            INSERT INTO model_registry (model_id, model_type, model_json, metrics_json, created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, NOW())
        """
        cursor.execute(insert_query, (snapshot_type, model_json, metrics_json))
        conn.commit()
        
        print(f"✅ Model {snapshot_type} registered successfully with API.")

    cursor.close()
    conn.close()
    print("\nAlpha Engine: Run Complete.")

if __name__ == "__main__":
    main()
