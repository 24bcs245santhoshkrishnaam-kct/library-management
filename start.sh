#!/bin/bash

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo " Starting AI-Powered Smart Library Management System"
echo "=========================================================="

# 1. Clean any lingering processes on ports 5001 and 3000 to avoid EADDRINUSE
echo "[1/4] Checking and freeing ports 5001 and 3000..."
lsof -ti :5001 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# 2. Build the latest React frontend production bundle
echo "[2/4] Building latest React frontend bundle..."
cd "$SCRIPT_DIR/frontend" && npm run build --silent

# 3. Start the Backend Express server in background
echo "[3/4] Launching Express & MySQL backend on port 5001..."
cd "$SCRIPT_DIR/backend"
node server.js &
BACKEND_PID=$!

# Wait 2 seconds for backend to initialize
sleep 2

# 4. Start the Frontend Vite dev server in background
echo "[4/4] Launching React Vite dev server on port 3000..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo " System Online! Open your browser:"
echo " 🌐 Frontend Dev Portal:  http://localhost:3000"
echo " 🌐 Unified Server:       http://localhost:5001"
echo " 🔌 Backend Health Check: http://localhost:5001/api/health"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."

# Trap SIGINT / SIGTERM to gracefully shut down both background processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait

