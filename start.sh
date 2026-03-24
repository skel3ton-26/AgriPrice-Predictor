#!/usr/bin/env bash
# start.sh — Run this to start the whole app
# Usage: bash start.sh

set -e

echo ""
echo "🌾  AgriPrice Predictor — Startup Script"
echo "────────────────────────────────────────"

# 1. Activate virtual env if present
if [ -d "venv" ]; then
  echo "✅  Activating virtual environment..."
  source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
else
  echo "⚠️   No venv found. Run: python -m venv venv && pip install -r requirements.txt"
  exit 1
fi

# 2. Generate data if needed
if [ ! -f "ml/data/commodity_prices.csv" ]; then
  echo "📊  Generating synthetic price data (first time only)..."
  python ml/generate_data.py
else
  echo "✅  Data file found."
fi

# 3. Start backend in background
echo "🚀  Starting FastAPI backend on http://localhost:8000 ..."
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "    Backend PID: $BACKEND_PID"

sleep 2

# 4. Start frontend
echo "🎨  Starting React frontend on http://localhost:3000 ..."
echo ""
echo "    Open → http://localhost:3000"
echo "    API docs → http://localhost:8000/docs"
echo ""
echo "    Press Ctrl+C to stop everything."
echo "────────────────────────────────────────"

trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM

cd frontend && npm run dev
