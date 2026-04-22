"""
Mosport V11 — FastAPI Endpoints

Endpoints:
    GET  /health         → {"status": "ok"}
    GET  /organism/demo  → Load mock JSON, run pipeline, return FinalDecision
    POST /organism/run   → Accept raw JSON, run pipeline, return FinalDecision
"""

import json
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI

from v11.runtime.loop import run_pipeline

app = FastAPI(title="Mosport V11 — Multi-Agent Runtime", version="11.0.0")

# Resolve mock data path relative to this file
MOCK_PATH = Path(__file__).resolve().parent.parent / "mock" / "sample_game_state.json"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/organism/demo")
def organism_demo():
    """Load mock JSON, run full pipeline, return FinalDecision."""
    with open(MOCK_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    return run_pipeline(raw_data)


@app.post("/organism/run")
def organism_run(payload: Dict[str, Any]):
    """Accept raw JSON, run full pipeline, return FinalDecision."""
    return run_pipeline(payload)
