#!/bin/bash
# OpenLedger ERP Offline Startup Script
echo "========================================="
echo "   Starting OpenLedger ERP Offline...   "
echo "========================================="

# Get directory where script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Run backend dev server in background
echo "Starting Backend Server..."
cd backend
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!

# Run frontend dev server in background
echo "Starting Frontend Server..."
cd ../frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait a moment for server initialization
sleep 2

# Open browser to local frontend port
echo "Opening web interface..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:5174"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  start "http://localhost:5174"
else
  xdg-open "http://localhost:5174"
fi

# Keep script running to allow graceful shutdown
echo "OpenLedger ERP is running!"
echo "Press Ctrl+C to stop both servers."

cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit
}

trap cleanup INT TERM

wait
