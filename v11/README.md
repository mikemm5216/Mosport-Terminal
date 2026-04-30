# Mosport V11 Engine

This directory contains the V11 organism backend.

## Deployment Notes

現有 Railway web service 用 root directory repo root。

Start command:
`uvicorn v11.api.main:app --host 0.0.0.0 --port $PORT`

Health:
`GET /health`

Runtime:
`POST /organism/run`

Frontend env:
`V11_API_URL=https://web-production-8703e.up.railway.app`
