from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
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
    db: Session = Depends(get_db)
):
    query = db.query(TransactionModel).filter(TransactionModel.user_id == user_id)
    
    if start_date:
        query = query.filter(TransactionModel.date >= start_date)
    if end_date:
        query = query.filter(TransactionModel.date <= end_date)
    if category_id:
        query = query.filter(TransactionModel.category_id == category_id)
    if is_recurring is not None:
        query = query.filter(TransactionModel.is_recurring == is_recurring)
    
    transactions = query.order_by(TransactionModel.date.desc()).offset(skip).limit(limit).all()
    return transactions

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
    if 'category_id' in update_data and new_category_id:
        categorization_service.learn_from_manual_categorization(
            user_id, db_transaction.description, new_category_id
        )
        
        # Auto-categorize similar transactions
        # Extract the base name from description (e.g., "RAISING CANES" from "RAISING CANES 1260 RALEIGH NC")
        base_description = db_transaction.description.split()[0:2]  # Take first 2 words
        base_pattern = ' '.join(base_description)
        
        similar_transactions = db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id,
            TransactionModel.id != transaction_id,
            TransactionModel.description.contains(base_pattern),
            TransactionModel.category_id.is_(None)
        ).all()
        
        for similar_tx in similar_transactions:
            similar_tx.category_id = new_category_id
        
        db.commit()
    
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
