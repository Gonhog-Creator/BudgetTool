from sqlalchemy.orm import Session
from typing import List, Tuple, Dict
from collections import defaultdict
from datetime import datetime, timedelta
from app.models import Transaction
import difflib
import re

class RecurringDetectionService:
    """Service for detecting recurring payments"""
    
    def detect_recurring_payments(self, db: Session, user_id: int):
        """Detect and mark recurring payments in the database for a specific user"""
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.date).all()
        
        # Group by similar descriptions
        groups = self._group_similar_transactions(transactions)
        
        # Check each group for recurring patterns
        for description, txs in groups.items():
            if len(txs) >= 2:  # Need at least 2 transactions
                pattern = self._detect_frequency(txs)
                if pattern:
                    # Mark all transactions in this group as recurring
                    for tx in txs:
                        tx.is_recurring = True
                        tx.recurring_pattern = pattern
        
        db.commit()
    
    def _group_similar_transactions(self, transactions: List[Transaction]) -> Dict[str, List[Transaction]]:
        """Group transactions by similar descriptions"""
        groups = defaultdict(list)
        
        for tx in transactions:
            # Normalize description for grouping
            normalized = self._normalize_description(tx.description)
            groups[normalized].append(tx)
        
        return groups
    
    def _normalize_description(self, description: str) -> str:
        """Normalize description for grouping"""
        # Remove common variations
        normalized = description.lower()
        # Remove dates, numbers, special chars
        normalized = re.sub(r'\d+', '', normalized)
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = ' '.join(normalized.split())  # Remove extra spaces
        return normalized
    
    def _detect_frequency(self, transactions: List[Transaction]) -> str:
        """Detect the frequency of recurring transactions"""
        if len(transactions) < 2:
            return None
        
        # Sort by date
        sorted_txs = sorted(transactions, key=lambda x: x.date)
        
        # Calculate intervals between transactions
        intervals = []
        for i in range(1, len(sorted_txs)):
            delta = (sorted_txs[i].date - sorted_txs[i-1].date).days
            intervals.append(delta)
        
        if not intervals:
            return None
        
        # Check for common patterns
        avg_interval = sum(intervals) / len(intervals)
        
        if 25 <= avg_interval <= 35:  # Monthly (30 days +/- 5)
            return "monthly"
        elif 6 <= avg_interval <= 9:  # Weekly (7 days +/- 1)
            return "weekly"
        elif 13 <= avg_interval <= 16:  # Bi-weekly (14 days +/- 2)
            return "biweekly"
        elif 85 <= avg_interval <= 95:  # Quarterly (90 days +/- 5)
            return "quarterly"
        elif 350 <= avg_interval <= 380:  # Yearly (365 days +/- 15)
            return "yearly"
        
        return None
