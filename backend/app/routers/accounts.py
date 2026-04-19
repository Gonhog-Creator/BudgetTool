from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Account as AccountModel, Transaction

router = APIRouter()

@router.get("/")
def get_accounts(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all accounts for a user"""
    accounts = db.query(AccountModel).filter(AccountModel.user_id == user_id).all()
    return [
        {
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type,
            "account_number": account.account_number,
            "balance": account.balance,
            "created_at": account.created_at
        }
        for account in accounts
    ]

@router.post("/")
def create_account(
    name: str,
    account_type: str,
    account_number: str = None,
    balance: float = 0.0,
    user_id: int = None,
    db: Session = Depends(get_db)
):
    """Create a new account"""
    account = AccountModel(
        name=name,
        account_type=account_type,
        account_number=account_number,
        balance=balance,
        user_id=user_id
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return {
        "id": account.id,
        "name": account.name,
        "account_type": account.account_type,
        "account_number": account.account_number,
        "balance": account.balance,
        "created_at": account.created_at
    }

@router.put("/{account_id}")
def update_account(
    account_id: int,
    name: str = None,
    account_type: str = None,
    account_number: str = None,
    balance: float = None,
    user_id: int = None,
    db: Session = Depends(get_db)
):
    """Update an account"""
    account = db.query(AccountModel).filter(
        AccountModel.id == account_id,
        AccountModel.user_id == user_id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if name:
        account.name = name
    if account_type:
        account.account_type = account_type
    if account_number is not None:
        account.account_number = account_number
    if balance is not None:
        account.balance = balance
    
    db.commit()
    db.refresh(account)
    
    return {
        "id": account.id,
        "name": account.name,
        "account_type": account.account_type,
        "account_number": account.account_number,
        "balance": account.balance,
        "created_at": account.created_at
    }

@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Delete an account"""
    account = db.query(AccountModel).filter(
        AccountModel.id == account_id,
        AccountModel.user_id == user_id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    db.delete(account)
    db.commit()
    
    return {"message": "Account deleted successfully"}

@router.post("/update-balances")
def update_account_balances(
    user_id: int,
    include_pending: bool = Query(True, description="Include pending transactions in balance calculations"),
    db: Session = Depends(get_db)
):
    """Calculate and update account balances from transactions"""
    accounts = db.query(AccountModel).filter(AccountModel.user_id == user_id).all()
    
    updated_accounts = []
    for account in accounts:
        # Get all transactions for this account
        transactions = db.query(Transaction).filter(
            Transaction.account_id == account.id,
            Transaction.user_id == user_id
        )
        
        if not include_pending:
            transactions = transactions.filter(Transaction.status == 'Posted')
        
        transactions = transactions.all()
        
        # Calculate balance based on account type
        if account.account_type == 'credit_card':
            # For credit cards: sum only posted transactions
            # The sum already represents the correct balance (positive = owe, negative = credit)
            posted_transactions = [t for t in transactions if t.status == 'Posted']
            balance = sum(t.amount for t in posted_transactions)
        else:
            # For checking: deposits (positive) increase balance, withdrawals (negative) decrease it
            balance = sum(t.amount for t in transactions)
        
        # Update account balance
        account.balance = balance
        updated_accounts.append({
            'id': account.id,
            'name': account.name,
            'balance': balance
        })
    
    db.commit()
    
    return {
        'message': f'Updated balances for {len(updated_accounts)} accounts',
        'accounts': updated_accounts
    }
