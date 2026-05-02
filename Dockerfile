FROM python:3.10-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential gcc g++ \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "python -m uvicorn v11.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
