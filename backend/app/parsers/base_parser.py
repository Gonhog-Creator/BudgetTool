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
    
    def normalize_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize transaction data to standard format"""
        return {
            'date': self._parse_date(transaction.get('date')),
            'description': transaction.get('description', '').strip(),
            'amount': float(transaction.get('amount', 0)),
            'account': transaction.get('account', 'Unknown'),
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
