from sqlalchemy.orm import Session
from app.models import Transaction as TransactionModel, Account
from datetime import timedelta
from typing import List, Tuple

class TransferDetectionService:
    """Service for detecting transfers between accounts"""
    
    def detect_transfers(self, db: Session, user_id: int):
        """
        Detect transfers between accounts by matching transactions with:
        - Same absolute amount
        - Opposite signs (one positive, one negative)
        - Within a reasonable time window (e.g., 7 days)
        - Different accounts
        """
        # Get all transactions for the user
        transactions = db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id
        ).all()
        
        # Group by absolute amount to find potential matches
        amount_groups = {}
        for tx in transactions:
            abs_amount = abs(tx.amount)
            if abs_amount not in amount_groups:
                amount_groups[abs_amount] = []
            amount_groups[abs_amount].append(tx)
        
        # Find potential transfer pairs
        transfer_pairs = []
        for abs_amount, txs in amount_groups.items():
            if len(txs) < 2:
                continue
            
            # Separate positive and negative transactions
            positive_txs = [tx for tx in txs if tx.amount > 0]
            negative_txs = [tx for tx in txs if tx.amount < 0]
            
            # Try to match positive with negative
            for pos_tx in positive_txs:
                for neg_tx in negative_txs:
                    # Skip if same account
                    if pos_tx.account_id == neg_tx.account_id:
                        continue
                    
                    # Check if within time window (7 days)
                    date_diff = abs((pos_tx.date - neg_tx.date).days)
                    if date_diff <= 7:
                        transfer_pairs.append((pos_tx, neg_tx))
        
        # Mark transactions as transfers
        marked_count = 0
        for pos_tx, neg_tx in transfer_pairs:
            # Check if description suggests a transfer/credit card payment
            pos_desc_lower = pos_tx.description.lower()
            neg_desc_lower = neg_tx.description.lower()
            
            transfer_keywords = ['payment', 'transfer', 'credit card', 'visa', 'mastercard', 'amex', 'discover']
            
            # If either description suggests a transfer, mark both
            if any(keyword in pos_desc_lower or keyword in neg_desc_lower for keyword in transfer_keywords):
                if pos_tx.transaction_type != 'transfer':
                    pos_tx.transaction_type = 'transfer'
                    marked_count += 1
                if neg_tx.transaction_type != 'transfer':
                    neg_tx.transaction_type = 'transfer'
                    marked_count += 1
        
        db.commit()
        return marked_count
    
    def detect_transfers_simple(self, db: Session, user_id: int):
        """
        Simple transfer detection based on description keywords
        This is a fallback method that marks transactions with transfer-related keywords
        """
        transfer_keywords = ['payment', 'transfer', 'credit card', 'visa', 'mastercard', 'amex', 'discover']
        
        transactions = db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id
        ).all()
        
        marked_count = 0
        for tx in transactions:
            if tx.transaction_type == 'transfer':
                continue
            
            desc_lower = tx.description.lower()
            if any(keyword in desc_lower for keyword in transfer_keywords):
                # For credit card payments from checking, mark as transfer
                if tx.account_type == 'checking' and tx.amount < 0:
                    tx.transaction_type = 'transfer'
                    marked_count += 1
        
        db.commit()
        return marked_count
