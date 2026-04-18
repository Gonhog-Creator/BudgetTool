# Budget Tracker

A cross-platform personal finance tracking tool with automatic bank statement parsing, categorization, and recurring payment detection.

## Features

- **Multi-format Import**: Supports CSV, OFX, QFX, and QBO bank statement formats
- **Auto-categorization**: Automatically categorizes transactions based on keyword matching
- **Recurring Payment Detection**: Identifies and tracks recurring payments (monthly, weekly, etc.)
- **Interactive Dashboard**: Visual charts for spending by category and over time
- **CSV Export**: Export your transactions for analysis in other tools
- **File Management**: View and manage uploaded bank statements
- **Database Migration**: Easy schema updates without manual database deletion
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Local-first**: All data stays on your machine - no cloud storage required

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLite**: Local database (no server required)
- **pandas**: Data processing
- **ofxparse**: OFX/QFX file parsing

### Frontend
- **React + TypeScript**: Modern UI framework
- **TailwindCSS**: Styling
- **Recharts**: Interactive charts
- **Vite**: Fast build tool

## Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn

## Installation

### Windows

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BudgetTool
   ```

2. **Set up Python backend**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up React frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the application**

   Using npm scripts (recommended):
   ```bash
   npm run dev
   ```

   Or manually:
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   venv\Scripts\activate
   python -m uvicorn main:app
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

   Note: Backend requires manual restart after code changes. Frontend hot-reloads automatically.

5. Open your browser to `http://localhost:3000`

### macOS/Linux

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BudgetTool
   ```

2. **Set up Python backend**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Set up React frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the application**

   Using npm scripts (recommended):
   ```bash
   npm run dev
   ```

   Or manually:
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   source venv/bin/activate
   python -m uvicorn main:app
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

   Note: Backend requires manual restart after code changes. Frontend hot-reloads automatically.

5. Open your browser to `http://localhost:3000`

## Quick Start Scripts

### Windows (run.bat)
```batch
@echo off
start cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app"
timeout /t 3 /nobreak
start cmd /k "cd frontend && npm run dev"
echo Budget Tracker is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
```

### macOS/Linux (run.sh)
```bash
#!/bin/bash
cd backend && source venv/bin/activate && python -m uvicorn main:app &
cd frontend && npm run dev &
echo "Budget Tracker is starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
```

## Usage

### Uploading Bank Statements

1. Navigate to the **Upload** tab
2. Drag and drop or select your bank statement file
3. Select account type (checking or credit card)
4. Supported formats:
   - **CSV**: Most bank exports work with automatic column detection
   - **OFX/QFX**: Quicken/QuickBooks format
   - **QBO**: QuickBooks Online format

### Managing Uploaded Files

1. Navigate to the **Upload** tab
2. View the "Uploaded Files" section below the upload area
3. See transaction counts and date ranges for each file
4. Delete files to remove all transactions from that file

### Database Migration

If you encounter schema errors or the file list doesn't work:
1. Navigate to the **Upload** tab
2. Click the "Update Database" button in the Uploaded Files section
3. Confirm the migration in the modal
4. The database schema will be updated automatically without data loss

### Setting Up Categories

1. Navigate to the **Categories** tab
2. Click **Add Category**
3. Set the name, description, color, and keywords
4. Keywords are used for auto-categorization (e.g., "netflix, spotify, gym" for Entertainment)

### Viewing Analytics

1. Navigate to the **Dashboard** tab
2. View spending by category (pie chart)
3. View spending over time (line chart)
4. See recurring payments summary

### Managing Transactions

1. Navigate to the **Transactions** tab
2. Search, filter by recurring status
3. Edit or delete transactions as needed

### Exporting Data

Use the CSV export API endpoint to download all transactions for external analysis.

## Supported Bank Formats

The tool automatically detects and parses:

- **CSV files**: Most banks export to CSV with varying column names. The parser automatically maps common column names.
- **OFX files**: Open Financial Exchange format (used by many banks)
- **QFX files**: Quicken format (variant of OFX)
- **QBO files**: QuickBooks Online format

If your bank's format isn't working, check the CSV column names match common patterns (date, description, amount, account).

## Data Storage

All data is stored locally in `backend/budget.db` (SQLite database). To backup your data:
1. Stop the application
2. Copy `backend/budget.db` to a safe location
3. To restore, replace the database file with your backup

## Troubleshooting

### Backend won't start
- Ensure Python 3.9+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify port 8000 is not in use

### Frontend won't start
- Ensure Node.js 18+ is installed
- Check that dependencies are installed: `npm install`
- Verify port 3000 is not in use

### File upload fails
- Check file format is supported (CSV, OFX, QFX, QBO)
- Ensure file is not corrupted
- Check browser console for error messages

### Categories not auto-assigning
- Ensure keywords are set for each category
- Keywords should be comma-separated (e.g., "netflix, spotify")
- Check that transaction descriptions contain the keywords

## Development

### Backend API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Building for Production

**Backend:**
```bash
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend:**
```bash
cd frontend
npm run build
```

The built frontend will be in `frontend/dist/` and can be served by any static file server.

## License

MIT License - feel free to use and modify for personal or commercial use.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
