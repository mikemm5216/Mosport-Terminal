# 使用輕量級 Python 3.11
FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# [關鍵] 安裝 Linux 系統層級的 C++ 依賴與 XGBoost 需要的 libomp
RUN apt-get update && apt-get install -y \
    build-essential \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴清單
COPY requirements.txt .

# 安裝 Python 套件
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有程式碼
COPY . .

# 設定環境變數，確保 Python 輸出直接顯示在 Railway Log
ENV PYTHONUNBUFFERED=1

# 暴露 FastAPI 預設埠號 (Railway 會自動偵測 $PORT)
EXPOSE 8000

# 啟動命令：使用 uvicorn 運行，並綁定到 0.0.0.0
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
