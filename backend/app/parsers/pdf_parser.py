from typing import List, Dict, Any
from datetime import datetime
import pdfplumber
import re
from .base_parser import BaseParser

class PDFParser(BaseParser):
    """Parser for PDF bank statements"""
    
    def can_parse(self, filename: str, content: bytes) -> bool:
        """Check if this parser can handle the given file"""
        return filename.lower().endswith('.pdf')
    
    def parse(self, content: bytes, filename: str) -> List[Dict[str, Any]]:
        """Parse PDF bank statement"""
        # Detect account type
        account_type = self.detect_account_type(content, filename)
        
        transactions = []
        
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        # Try to detect bank type and parse accordingly
                        if 'First Citizens' in text or 'FIRST CITIZENS' in text:
                            page_transactions = self._parse_first_citizens(text, page, account_type)
                        else:
                            page_transactions = self._parse_generic_pdf(text, page, account_type)
                        transactions.extend(page_transactions)
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")
        
        return transactions
    
    def _parse_first_citizens(self, text: str, page, account_type: str) -> List[Dict[str, Any]]:
        """Parse First Citizens Bank PDF format"""
        transactions = []
        lines = text.split('\n')
        
        # First Citizens format typically has:
        # Date Description Amount Balance
        # Example: 01/15/2024 PAYMENT - WALMART -45.67 1234.56
        
        for i, line in enumerate(lines):
            # Look for transaction lines (start with date)
            if re.match(r'^\d{1,2}/\d{1,2}/\d{4}', line):
                try:
                    parts = line.split()
                    if len(parts) >= 3:
                        date_str = parts[0]
                        amount_str = parts[-1]
                        
                        # Parse date
                        try:
                            date = datetime.strptime(date_str, '%m/%d/%Y')
                        except:
                            try:
                                date = datetime.strptime(date_str, '%m/%d/%y')
                            except:
                                continue
                        
                        # Parse amount (handle negative numbers)
                        try:
                            amount = float(amount_str.replace(',', '').replace('$', ''))
                        except:
                            continue
                        
                        # Description is everything between date and amount
                        description = ' '.join(parts[1:-1])
                        
                        # Normalize description
                        description = self._normalize_description(description)
                        
                        transaction = {
                            'date': date,
                            'description': description,
                            'amount': amount,
                            'account': 'First Citizens',
                            'account_type': account_type
                        }
                        
                        # Detect transaction type
                        transaction_type = self.detect_transaction_type(transaction, account_type)
                        if transaction_type:
                            transaction['transaction_type'] = transaction_type
                        
                        transactions.append(transaction)
                except Exception as e:
                    # Skip lines that don't parse correctly
                    continue
        
        return transactions
    
    def _parse_generic_pdf(self, text: str, page, account_type: str) -> List[Dict[str, Any]]:
        """Parse generic PDF bank statement"""
        transactions = []
        lines = text.split('\n')
        
        # Generic pattern: look for lines with dates and amounts
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
        amount_pattern = r'-?\$?\d+[,.]?\d*\.?\d{2}'
        
        for line in lines:
            # Skip empty lines and headers
            if not line.strip() or 'Balance' in line or 'Total' in line:
                continue
            
            # Look for lines that match date and amount patterns
            date_match = re.search(date_pattern, line)
            amount_match = re.search(amount_pattern, line)
            
            if date_match and amount_match:
                try:
                    date_str = date_match.group()
                    amount_str = amount_match.group()
                    
                    # Parse date
                    try:
                        date = datetime.strptime(date_str, '%m/%d/%Y')
                    except:
                        try:
                            date = datetime.strptime(date_str, '%m/%d/%y')
                        except:
                            try:
                                date = datetime.strptime(date_str, '%Y-%m-%d')
                            except:
                                continue
                    
                    # Parse amount
                    amount = float(amount_str.replace(',', '').replace('$', '').replace('-', ''))
                    if '-' in amount_str or 'CR' in line.upper():
                        amount = -abs(amount)
                    
                    # Extract description (remove date and amount)
                    description = line
                    description = re.sub(date_pattern, '', description)
                    description = re.sub(amount_pattern, '', description)
                    description = description.strip()
                    
                    # Normalize description
                    description = self._normalize_description(description)
                    
                    if description:
                        transaction = {
                            'date': date,
                            'description': description,
                            'amount': amount,
                            'account': 'PDF Statement',
                            'account_type': account_type
                        }
                        
                        # Detect transaction type
                        transaction_type = self.detect_transaction_type(transaction, account_type)
                        if transaction_type:
                            transaction['transaction_type'] = transaction_type
                        
                        transactions.append(transaction)
                except Exception as e:
                    continue
        
        return transactions

import io
