@echo off
echo Starting Budget Tracker...

REM Start backend
echo Starting backend on http://localhost:8000...
start "Budget Tracker Backend" cmd /k "cd backend && if exist venv\Scripts\activate.bat (venv\Scripts\activate.bat && python -m uvicorn main:app --reload) else (echo Virtual environment not found. Please run setup first.)"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo Starting frontend on http://localhost:3000...
start "Budget Tracker Frontend" cmd /k "cd frontend && if exist node_modules (npm run dev) else (echo Dependencies not installed. Please run npm install first.)"

echo.
echo Budget Tracker is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
pause
