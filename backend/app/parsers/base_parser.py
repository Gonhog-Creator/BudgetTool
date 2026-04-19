from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime

class BaseParser(ABC):
    """Base class for bank statement parsers"""
    
    @abstractmethod
    def can_parse(self, filename: str, content: bytes) -> bool:
        """Check if this parser can handle the given file"""
        pass
    
    @abstractmethod
    def parse(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        """Parse the file and return list of transaction dictionaries"""
        pass
    
    def detect_account_type(self, content: bytes, filename: str) -> str:
        """Detect if the statement is from a checking account or credit card"""
        # Convert content to string if possible
        try:
            content_str = content.decode('utf-8', errors='ignore').lower()
        except:
            content_str = ""
        
        # Credit card keywords
        credit_card_keywords = [
            'credit card', 'visa', 'mastercard', 'american express', 'amex',
            'discover', 'payment due', 'minimum payment', 'credit limit',
            'available credit', 'statement balance', 'new balance',
            'previous balance', 'interest charge', 'finance charge'
        ]
        
        # Check for credit card indicators
        for keyword in credit_card_keywords:
            if keyword in content_str or keyword in filename.lower():
                return "credit_card"
        
        # Default to checking account
        return "checking"
    
    def detect_transaction_type(self, transaction: Dict[str, Any], account_type: str) -> str:
        """Detect transaction type based on account type and amount"""
        amount = transaction.get('amount', 0)
        description = transaction.get('description', '').lower()
        
        if account_type == "credit_card":
            # Credit cards: negative = purchase (spending), positive = payment (income)
            if amount < 0:
                return "purchase"
            elif amount > 0:
                return "payment"
        else:
            # Checking accounts: negative = withdrawal (spending), positive = deposit (income)
            if amount < 0:
                return "withdrawal"
            elif amount > 0:
                return "deposit"
        
        return None
    
    def normalize_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize transaction data to standard format"""
        return {
            'date': self._parse_date(transaction.get('date')),
            'description': transaction.get('description', '').strip(),
            'amount': float(transaction.get('amount', 0)),
            'account': transaction.get('account', 'Unknown'),
            'account_number': transaction.get('account_number'),
            'account_type': transaction.get('account_type'),
            'transaction_type': transaction.get('transaction_type'),
            'status': transaction.get('status', 'Posted'),
        }
    
    def _parse_date(self, date_value: Any) -> datetime:
        """Parse various date formats"""
        if isinstance(date_value, datetime):
            return date_value
        if isinstance(date_value, str):
            # Try common formats
            formats = [
                '%Y-%m-%d',
                '%m/%d/%Y',
                '%d/%m/%Y',
                '%Y/%m/%d',
                '%m-%d-%Y',
                '%d-%m-%Y',
            ]
            for fmt in formats:
                try:
                    return datetime.strptime(date_value, fmt)
                except ValueError:
                    continue
            # Try parsing with dateutil
            try:
                from dateutil.parser import parse
                return parse(date_value)
            except:
                pass
        raise ValueError(f"Cannot parse date: {date_value}")
