from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Transaction as TransactionModel, Category, Account
from app.schemas import TransactionCreate, Transaction, UploadResponse
from app.parsers.parser_factory import ParserFactory
from app.services.categorization import CategorizationService
from app.services.recurring_detection import RecurringDetectionService
from app.services.transfer_detection import TransferDetectionService

router = APIRouter()
parser_factory = ParserFactory()
categorization_service = CategorizationService()
recurring_service = RecurringDetectionService()
transfer_service = TransferDetectionService()

@router.post("/statement", response_model=UploadResponse)
async def upload_statement(
    file: UploadFile = File(...),
    user_id: int = Query(..., description="User ID to associate transactions with"),
    account_type: str = Query(None, description="Account type: checking or credit_card"),
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
            # Use provided account_type if available, otherwise use auto-detected type
            final_account_type = account_type or tx_data.get('account_type', 'checking')
            
            # Find or create account
            account_name = tx_data.get('account', f"{final_account_type.title()} Account")
            account_number = tx_data.get('account_number')
            
            # Try to find existing account
            account = db.query(Account).filter(
                Account.user_id == user_id,
                Account.name == account_name,
                Account.account_type == final_account_type
            ).first()
            
            # Create account if it doesn't exist
            if not account:
                account = Account(
                    name=account_name,
                    account_type=final_account_type,
                    account_number=account_number,
                    user_id=user_id
                )
                db.add(account)
                db.flush()  # Get the account ID
            
            # Determine transaction type based on amount and account type
            transaction_type = tx_data.get('transaction_type')
            if not transaction_type:
                if tx_data['amount'] > 0:
                    transaction_type = 'deposit'
                elif final_account_type == 'credit_card':
                    transaction_type = 'purchase'
                else:
                    transaction_type = 'withdrawal'
            
            transaction = TransactionModel(
                date=tx_data['date'],
                description=tx_data['description'],
                amount=tx_data['amount'],
                account_name=tx_data.get('account'),
                account_number=tx_data.get('account_number'),
                account_id=account.id,
                category_id=tx_data.get('category_id'),
                user_id=user_id,
                original_filename=file.filename,
                account_type=final_account_type,
                transaction_type=transaction_type,
                status=tx_data.get('status', 'Posted')
            )
            db.add(transaction)
            created_transactions.append(transaction)
        
        db.commit()
        
        # Refresh to get IDs
        for tx in created_transactions:
            db.refresh(tx)
        
        # Detect transfers between accounts
        transfer_service.detect_transfers_simple(db, user_id)
        
        # Detect recurring payments for this user
        recurring_service.detect_recurring_payments(db, user_id)
        
        # Serialize transactions for response
        serialized_transactions = []
        for tx in created_transactions:
            tx_dict = {
                'id': tx.id,
                'date': tx.date,
                'description': tx.description,
                'amount': tx.amount,
                'account_name': tx.account_name,
                'account_number': tx.account_number,
                'category_id': tx.category_id,
                'user_id': tx.user_id,
                'is_recurring': tx.is_recurring,
                'recurring_pattern': tx.recurring_pattern,
                'original_filename': tx.original_filename,
                'notes': tx.notes,
                'created_at': tx.created_at,
                'account_type': tx.account_type,
                'transaction_type': tx.transaction_type,
                'category': None
            }
            serialized_transactions.append(Transaction(**tx_dict))
        
        return UploadResponse(
            message=f"Successfully imported {len(created_transactions)} transactions",
            transactions_imported=len(created_transactions),
            transactions=serialized_transactions
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
            tx.account_name,
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

@router.get("/files")
async def list_uploaded_files(
    user_id: int = Query(..., description="User ID to list files for"),
    db: Session = Depends(get_db)
):
    """List all unique uploaded files for a user"""
    from sqlalchemy import func, inspect
    
    try:
        # Query distinct filenames with transaction counts
        files = db.query(
            TransactionModel.original_filename,
            func.count(TransactionModel.id).label('transaction_count'),
            func.min(TransactionModel.date).label('first_transaction_date'),
            func.max(TransactionModel.date).label('last_transaction_date')
        ).filter(
            TransactionModel.user_id == user_id
        ).group_by(
            TransactionModel.original_filename
        ).all()
        
        return [
            {
                'filename': file.original_filename if file.original_filename else 'Unknown file',
                'transaction_count': file.transaction_count,
                'first_transaction_date': file.first_transaction_date.isoformat() if file.first_transaction_date else None,
                'last_transaction_date': file.last_transaction_date.isoformat() if file.last_transaction_date else None
            }
            for file in files
        ]
    except AttributeError:
        # Column doesn't exist in database, return empty list
        return []

@router.delete("/files/{filename}")
async def delete_file_transactions(
    filename: str,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Delete all transactions from a specific file"""
    # Decode URL-encoded filename
    from urllib.parse import unquote
    from sqlalchemy import inspect
    decoded_filename = unquote(filename)
    
    # Check if original_filename column exists
    inspector = inspect(db.bind)
    columns = [col['name'] for col in inspector.get_columns('transactions')]
    
    if 'original_filename' not in columns:
        # Column doesn't exist, return error
        return {
            'message': 'Cannot delete files: database schema is outdated. Please delete the database file and restart the server.',
            'deleted_count': 0
        }
    
    # Delete transactions from this file
    deleted = db.query(TransactionModel).filter(
        TransactionModel.user_id == user_id,
        TransactionModel.original_filename == decoded_filename
    ).delete()
    
    db.commit()
    
    return {
        'message': f'Deleted {deleted} transactions from {decoded_filename}',
        'deleted_count': deleted
    }

@router.post("/detect-transfers")
async def detect_transfers(
    user_id: int = Query(..., description="User ID to detect transfers for"),
    db: Session = Depends(get_db)
):
    """Detect and mark transfers between accounts"""
    marked_count = transfer_service.detect_transfers_simple(db, user_id)
    return {
        'message': f'Detected and marked {marked_count} transactions as transfers',
        'marked_count': marked_count
    }

@router.post("/migrate")
async def migrate_database():
    """Run database migration to add missing columns"""
    import sqlite3
    import os
    from app.database import DATABASE_URL
    
    # Extract database path from DATABASE_URL
    db_path = DATABASE_URL.replace('sqlite:///', '')
    
    # Make it absolute if it's relative
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(__file__), '..', '..', db_path)
    
    db_path = os.path.abspath(db_path)
    
    if not os.path.exists(db_path):
        return {
            'message': f'Database not found at {db_path}. No migration needed.',
            'migrated': False
        }
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check existing columns
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        migrations = []
        
        # Add account_type column
        if 'account_type' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_type TEXT DEFAULT 'checking'")
            migrations.append('account_type')
        
        # Add transaction_type column
        if 'transaction_type' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN transaction_type TEXT")
            migrations.append('transaction_type')
        
        # Add original_filename column
        if 'original_filename' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN original_filename TEXT")
            migrations.append('original_filename')
        
        # Add account_number column
        if 'account_number' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_number TEXT")
            migrations.append('account_number')
        
        # Add account_id column
        if 'account_id' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_id INTEGER")
            migrations.append('account_id')
        
        # Add account_name column
        if 'account_name' not in columns:
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_name TEXT")
            migrations.append('account_name')
        
        # Create accounts table if it doesn't exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    account_type TEXT NOT NULL,
                    account_number TEXT,
                    balance REAL DEFAULT 0.0,
                    user_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            migrations.append('accounts table')
        
        conn.commit()
        
        if migrations:
            return {
                'message': f'Migration completed. Added columns: {", ".join(migrations)}',
                'migrated': True,
                'columns_added': migrations
            }
        else:
            return {
                'message': 'Database is already up to date',
                'migrated': False
            }
        
    except Exception as e:
        conn.rollback()
        return {
            'message': f'Migration failed: {str(e)}',
            'migrated': False,
            'error': str(e)
        }
    finally:
        conn.close()
