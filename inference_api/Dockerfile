FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# [關鍵修復] 安裝系統級依賴：包含 C++ 編譯器、XGBoost 依賴與 PostgreSQL 驅動
RUN apt-get update && apt-get install -y \
    build-essential \
    libomp-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 啟動命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
