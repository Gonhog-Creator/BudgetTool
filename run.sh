#!/bin/bash
echo "Starting Budget Tracker..."

# Start backend
echo "Starting backend on http://localhost:8000..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    python -m uvicorn main:app --reload &
    BACKEND_PID=$!
else
    echo "Virtual environment not found. Please run setup first."
    exit 1
fi

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on http://localhost:3000..."
cd ../frontend
if [ -d "node_modules" ]; then
    npm run dev &
    FRONTEND_PID=$!
else
    echo "Dependencies not installed. Please run npm install first."
    kill $BACKEND_PID
    exit 1
fi

echo ""
echo "Budget Tracker is starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
