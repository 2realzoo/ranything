#!/bin/bash
# RAG Project - Start all services

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting RAG Application..."

# Start backend
echo "→ Starting FastAPI backend on :8000"
cd "$SCRIPT_DIR/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "→ Starting React frontend on :5173"
cd "$SCRIPT_DIR/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:5173"
echo "✓ API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
