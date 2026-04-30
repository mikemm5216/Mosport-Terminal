import sys
sys.path.insert(0, '.')
from v11.runtime.loop import run_pipeline

# Test 1: V11-only payload (backward compat)
v11_payload = {
    "game_id": "test_v11_compat",
    "sport": "baseball",
    "home_team": "Twins",
    "away_team": "Mets",
    "market_home_prob": 0.57,
    "signals": {
        "pressure": 0.62, "fatigue": 0.48, "volatility": 0.57,
        "momentum": 0.42, "mismatch": 0.71
    },
    "tags": ["pre_game"]
}
print("=== V11 compat test ===")
r = run_pipeline(v11_payload)
print("label:", r["label"])
print("action:", r["action"])
print("dominant_agent:", r["dominant_agent"])
print("edge_vs_market:", r["edge_vs_market"])
required = ["game_id","final_probability_home","market_home_prob","decision_score",
            "label","action","edge_vs_market","dominant_agent","explanation","opinions"]
missing = [k for k in required if k not in r]
print("Missing keys:", missing or "NONE")
print("RESULT:", "PASS" if not missing else "FAIL")

print()

# Test 2: V12 full payload
v12_payload = {
    "game_id": "test_v12",
    "sport": "basketball",
    "home_team": "Golden State Warriors",
    "away_team": "Los Angeles Lakers",
    "market_home_prob": 0.52,
    "signals": {
        "pressure": 0.6, "fatigue": 0.35, "volatility": 0.5,
        "momentum": 0.5, "mismatch": 0.4,
        "roster_risk": 0.3, "team_collapse_risk": 0.42, "player_leverage": 0.55
    },
    "player_states": {
        "away": [{
            "name": "Team Key Player", "team": "LAL", "side": "away",
            "role": "KEY PLAYER - ROSTER PENDING",
            "source": "simulated_player_state_team_placeholder",
            "placeholder": True,
            "physical": {"recovery": 0.7, "fatigue": 0.3, "sleep_debt": 1.0, "hrv_delta": 0.02, "collapse_risk": 0.25},
            "psychological": {"confidence": 0.58, "pressure_response": 0.62, "volatility": 0.4, "clutch_stability": 0.55, "tilt_risk": 0.25},
            "readiness": {"flag": "CLEAR", "minutes_risk": 0.2, "collapse_risk": 0.25},
            "importance_score": 0.5
        }],
        "home": []
    },
    "team_states": {
        "away": {"team": "LAL", "side": "away", "physical_load": 0.4, "mental_pressure": 0.5,
                 "rotation_risk": 0.3, "star_dependency": 0.5, "bench_fragility": 0.4,
                 "collapse_probability": 0.35, "key_player_count": 1, "placeholder_count": 1, "data_confidence": 0.35},
        "home": {"team": "GSW", "side": "home", "physical_load": 0.4, "mental_pressure": 0.5,
                 "rotation_risk": 0.3, "star_dependency": 0.5, "bench_fragility": 0.4,
                 "collapse_probability": 0.35, "key_player_count": 0, "placeholder_count": 0, "data_confidence": 0.3}
    },
    "matchup_context": {"player_edges": {}, "unit_edges": {}, "zone_edges": {}},
    "tags": ["live"]
}

print("=== V12 full payload test ===")
r2 = run_pipeline(v12_payload)
print("label:", r2["label"])
print("action:", r2["action"])
print("dominant_agent:", r2["dominant_agent"])
print("edge_vs_market:", r2["edge_vs_market"])
print("final_probability_home:", r2["final_probability_home"])

missing2 = [k for k in required if k not in r2]
print("Missing keys:", missing2 or "NONE")

for op in r2["opinions"]:
    agent = op["agent"]
    features = op["features_used"]
    lean = op["lean"]
    conf = op["confidence"]
    print("  " + agent + " lean=" + lean + " conf=" + str(conf) + " features=" + str(features))

# Check V12 features are being consumed
sharp_op = next((o for o in r2["opinions"] if o["agent"] == "SharpAgent"), None)
analyst_op = next((o for o in r2["opinions"] if o["agent"] == "AnalystAgent"), None)
v12_sharp_ok = sharp_op and "roster_risk" in sharp_op["features_used"]
v12_analyst_ok = analyst_op and "data_confidence" in analyst_op["features_used"]

print("V12 SharpAgent features consumed:", "YES" if v12_sharp_ok else "NO (V11 fallback)")
print("V12 AnalystAgent features consumed:", "YES" if v12_analyst_ok else "NO (V11 fallback)")
print("RESULT:", "PASS" if not missing2 else "FAIL")
