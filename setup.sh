#!/bin/bash
echo "Setting up Budget Tracker for macOS/Linux..."

# Setup Python backend
echo ""
echo "Setting up Python backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Setup React frontend
echo ""
echo "Setting up React frontend..."
cd frontend

echo "Installing Node.js dependencies..."
npm install

cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To run the application:"
echo "  - Make run.sh executable: chmod +x run.sh"
echo "  - Run: ./run.sh"
echo ""
echo "Backend will run on http://localhost:8000"
echo "Frontend will run on http://localhost:3000"
echo ""
