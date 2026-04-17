@echo off
echo Setting up Budget Tracker for Windows...

REM Setup Python backend
echo.
echo Setting up Python backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

cd ..

REM Setup React frontend
echo.
echo Setting up React frontend...
cd frontend

echo Installing Node.js dependencies...
call npm install

cd ..

echo.
echo Setup complete!
echo.
echo To run the application:
echo   - Double-click run.bat
echo   - Or run: run.bat
echo.
echo Backend will run on http://localhost:8000
echo Frontend will run on http://localhost:3000
echo.
pause
