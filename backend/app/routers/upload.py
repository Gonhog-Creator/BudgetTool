from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Transaction, Category
from app.schemas import TransactionCreate, Transaction, UploadResponse
from app.parsers.parser_factory import ParserFactory
from app.services.categorization import CategorizationService
from app.services.recurring_detection import RecurringDetectionService

router = APIRouter()
parser_factory = ParserFactory()
categorization_service = CategorizationService()
recurring_service = RecurringDetectionService()

@router.post("/statement", response_model=UploadResponse)
async def upload_statement(
    file: UploadFile = File(...),
    user_id: int = Query(..., description="User ID to associate transactions with"),
    db: Session = Depends(get_db)
):
    try:
        # Read file content
        content = await file.read()
        
        # Parse file
        transactions_data = parser_factory.parse_file(file.filename, content)
        
        if not transactions_data:
            raise HTTPException(status_code=400, detail="No transactions found in file")
        
        # Auto-categorize transactions for this user
        categorized_transactions = categorization_service.categorize_transactions(
            transactions_data, db, user_id
        )
        
        # Create transaction records
        created_transactions = []
        for tx_data in categorized_transactions:
            transaction = Transaction(
                date=tx_data['date'],
                description=tx_data['description'],
                amount=tx_data['amount'],
                account=tx_data['account'],
                category_id=tx_data.get('category_id'),
                user_id=user_id,
                original_filename=file.filename
            )
            db.add(transaction)
            created_transactions.append(transaction)
        
        db.commit()
        
        # Refresh to get IDs
        for tx in created_transactions:
            db.refresh(tx)
        
        # Detect recurring payments for this user
        recurring_service.detect_recurring_payments(db, user_id)
        
        return UploadResponse(
            message=f"Successfully imported {len(created_transactions)} transactions",
            transactions_imported=len(created_transactions),
            transactions=created_transactions
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/csv-export")
async def export_csv(
    user_id: int = Query(..., description="User ID to export transactions for"),
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    from fastapi.responses import Response
    import csv
    from io import StringIO
    from datetime import datetime
    
    # Build query
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    
    if start_date:
        query = query.filter(Transaction.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.date <= datetime.fromisoformat(end_date))
    
    transactions = query.order_by(Transaction.date.desc()).all()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Date', 'Description', 'Amount', 'Account', 'Category', 'Is Recurring', 'Notes'])
    
    # Data rows
    for tx in transactions:
        category_name = tx.category.name if tx.category else "Uncategorized"
        writer.writerow([
            tx.date.strftime('%Y-%m-%d'),
            tx.description,
            tx.amount,
            tx.account,
            category_name,
            tx.is_recurring,
            tx.notes or ''
        ])
    
    # Return as downloadable file
    return Response(
        content=output.getvalue(),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=transactions_export.csv'}
    )
