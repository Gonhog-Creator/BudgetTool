from typing import List, Dict, Any
import io
from ofxparse import OfxParser
from app.parsers.base_parser import BaseParser

class OFXParser(BaseParser):
    """Parser for OFX and QFX bank statements"""
    
    def can_parse(self, filename: str, content: bytes) -> bool:
        return filename.lower().endswith(('.ofx', '.qfx', '.qbo'))
    
    def parse(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        try:
            # Parse OFX content
            ofx = OfxParser.parse(io.BytesIO(content))
            
            transactions = []
            account_name = "Unknown"
            
            # Get account info
            if ofx.account:
                account_name = ofx.account.account_id or filename
            
            # Parse transactions
            for transaction in ofx.account.statement.transactions:
                try:
                    # Determine amount (debits are negative in OFX)
                    amount = transaction.amount
                    if transaction.type == 'debit':
                        amount = -abs(amount)
                    elif transaction.type == 'credit':
                        amount = abs(amount)
                    
                    transaction_dict = {
                        'date': transaction.date,
                        'description': transaction.memo or transaction.payee or transaction.id,
                        'amount': amount,
                        'account': account_name,
                    }
                    transactions.append(self.normalize_transaction(transaction_dict))
                except Exception as e:
                    print(f"Error parsing transaction: {e}")
                    continue
            
            return transactions
        except Exception as e:
            raise ValueError(f"Error parsing OFX/QFX file: {e}")
