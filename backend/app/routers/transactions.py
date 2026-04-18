from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Transaction as TransactionModel
from app.schemas import TransactionCreate, TransactionUpdate, Transaction
from app.services.categorization import CategorizationService

router = APIRouter()
categorization_service = CategorizationService()

@router.post("/", response_model=Transaction)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = TransactionModel(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    # Learn from manual categorization if category was set
    if transaction.category_id:
        categorization_service.learn_from_manual_categorization(
            transaction.user_id, transaction.description, transaction.category_id
        )
    
    return db_transaction

@router.get("/", response_model=List[Transaction])
def get_transactions(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category_id: Optional[int] = None,
    is_recurring: Optional[bool] = None,
    amount_filter: Optional[str] = Query(None, description="Filter by amount: 'income', 'expense', or None for all"),
    search: Optional[str] = Query(None, description="Search in description and account"),
    exclude: Optional[str] = Query(None, description="Exclude keywords from search (comma-separated)"),
    uncategorized_only: Optional[bool] = Query(None, description="Filter to show only uncategorized transactions"),
    sort_by: Optional[str] = Query(None, description="Sort by: 'date' (default) or 'similarity'"),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: amount_filter = {amount_filter}, search = {search}, exclude = {exclude}, uncategorized_only = {uncategorized_only}, sort_by = {sort_by}")
    query = db.query(TransactionModel).filter(TransactionModel.user_id == user_id)
    
    if start_date:
        query = query.filter(TransactionModel.date >= start_date)
    if end_date:
        query = query.filter(TransactionModel.date <= end_date)
    if category_id:
        query = query.filter(TransactionModel.category_id == category_id)
    if is_recurring is not None:
        query = query.filter(TransactionModel.is_recurring == is_recurring)
    if amount_filter == "income":
        print(f"DEBUG: Filtering for income (amount >= 0)")
        query = query.filter(TransactionModel.amount >= 0)
    elif amount_filter == "expense":
        print(f"DEBUG: Filtering for expense (amount < 0)")
        query = query.filter(TransactionModel.amount < 0)
    if search:
        query = query.filter(
            TransactionModel.description.ilike(f"%{search}%") |
            TransactionModel.account.ilike(f"%{search}%")
        )
    if exclude:
        exclude_terms = [term.strip() for term in exclude.split(',')]
        for term in exclude_terms:
            query = query.filter(
                ~TransactionModel.description.ilike(f"%{term}%") &
                ~TransactionModel.account.ilike(f"%{term}%")
            )
    if uncategorized_only:
        query = query.filter(TransactionModel.category_id.is_(None))
    
    if sort_by == "similarity":
        # Sort by description to group similar transactions together
        transactions = query.order_by(TransactionModel.description.asc()).offset(skip).limit(limit).all()
    else:
        transactions = query.order_by(TransactionModel.date.desc()).offset(skip).limit(limit).all()
    
    print(f"DEBUG: Returning {len(transactions)} transactions")
    return transactions

@router.get("/count")
def get_transaction_count(
    user_id: int,
    amount_filter: Optional[str] = Query(None, description="Filter by amount: 'income', 'expense', or None for all"),
    search: Optional[str] = Query(None, description="Search in description and account"),
    exclude: Optional[str] = Query(None, description="Exclude keywords from search (comma-separated)"),
    uncategorized_only: Optional[bool] = Query(None, description="Filter to show only uncategorized transactions"),
    db: Session = Depends(get_db)
):
    query = db.query(TransactionModel).filter(TransactionModel.user_id == user_id)
    
    if amount_filter == "income":
        query = query.filter(TransactionModel.amount >= 0)
    elif amount_filter == "expense":
        query = query.filter(TransactionModel.amount < 0)
    if search:
        query = query.filter(
            TransactionModel.description.ilike(f"%{search}%") |
            TransactionModel.account.ilike(f"%{search}%")
        )
    if exclude:
        exclude_terms = [term.strip() for term in exclude.split(',')]
        for term in exclude_terms:
            query = query.filter(
                ~TransactionModel.description.ilike(f"%{term}%") &
                ~TransactionModel.account.ilike(f"%{term}%")
            )
    if uncategorized_only:
        query = query.filter(TransactionModel.category_id.is_(None))
    
    count = query.count()
    return {"count": count}

@router.get("/uncategorized-count")
def get_uncategorized_count(user_id: int, db: Session = Depends(get_db)):
    count = db.query(TransactionModel).filter(
        TransactionModel.user_id == user_id,
        TransactionModel.category_id.is_(None)
    ).count()
    return {"count": count}

@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(transaction_id: int, user_id: int, db: Session = Depends(get_db)):
    transaction = db.query(TransactionModel).filter(
        TransactionModel.id == transaction_id,
        TransactionModel.user_id == user_id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(transaction_id: int, transaction: TransactionUpdate, user_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(TransactionModel).filter(
        TransactionModel.id == transaction_id,
        TransactionModel.user_id == user_id
    ).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = transaction.model_dump(exclude_unset=True)
    old_category_id = db_transaction.category_id
    new_category_id = update_data.get('category_id')
    
    for key, value in update_data.items():
        setattr(db_transaction, key, value)
    
    db.commit()
    db.refresh(db_transaction)
    
    # Learn from manual categorization if category was updated
    if 'category_id' in update_data:
        if new_category_id:
            categorization_service.learn_from_manual_categorization(
                user_id, db_transaction.description, new_category_id
            )
            
            # Auto-categorize similar transactions
            # Match exact description to update ALL transactions with the same name
            print(f"DEBUG: Auto-categorizing similar transactions")
            print(f"DEBUG: Description: {db_transaction.description}")
            
            similar_transactions = db.query(TransactionModel).filter(
                TransactionModel.user_id == user_id,
                TransactionModel.id != transaction_id,
                TransactionModel.description == db_transaction.description
            ).all()
            
            print(f"DEBUG: Found {len(similar_transactions)} transactions with exact same description")
            
            for similar_tx in similar_transactions:
                similar_tx.category_id = new_category_id
                print(f"DEBUG: Categorizing transaction {similar_tx.id}: {similar_tx.description}")
            
            if similar_transactions:
                db.commit()
                print(f"DEBUG: Committed {len(similar_transactions)} similar transactions")
    
    return db_transaction

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, user_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(TransactionModel).filter(
        TransactionModel.id == transaction_id,
        TransactionModel.user_id == user_id
    ).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(db_transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}

@router.post("/bulk", response_model=List[Transaction])
def create_transactions_bulk(transactions: List[TransactionCreate], db: Session = Depends(get_db)):
    db_transactions = [TransactionModel(**t.model_dump()) for t in transactions]
    db.add_all(db_transactions)
    db.commit()
    for transaction in db_transactions:
        db.refresh(transaction)
    return db_transactions
