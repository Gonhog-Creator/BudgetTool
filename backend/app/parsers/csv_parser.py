from typing import List, Dict, Any
import pandas as pd
import io
from app.parsers.base_parser import BaseParser

class CSVParser(BaseParser):
    """Parser for CSV bank statements"""
    
    # Common column name mappings
    COLUMN_MAPPINGS = {
        'date': ['date', 'transaction date', 'posted date', 'transactiondate', 'posteddate', 'dt', 'post date'],
        'description': ['description', 'description', 'merchant', 'payee', 'transaction', 'details', 'memo'],
        'debit': ['debit'],
        'credit': ['credit'],
        'amount': ['amount', 'transaction amount', 'value'],
        'account': ['account', 'account number', 'bank account', 'account #'],
        'account_number': ['account number', 'account'],
    }
    
    def can_parse(self, filename: str, content: bytes) -> bool:
        return filename.lower().endswith('.csv')
    
    def parse(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        try:
            # Detect account type
            account_type = self.detect_account_type(content, filename)
            
            # Read CSV with pandas
            df = pd.read_csv(io.BytesIO(content))
            
            # Normalize column names
            df.columns = [col.strip().lower() for col in df.columns]
            
            # Map columns to standard names
            mapped_df = self._map_columns(df)
            
            transactions = []
            for _, row in mapped_df.iterrows():
                try:
                    # Calculate amount from debit/credit columns if available
                    amount = 0.0
                    if 'debit' in mapped_df.columns and 'credit' in mapped_df.columns:
                        debit = self._parse_amount(row.get('debit', 0))
                        credit = self._parse_amount(row.get('credit', 0))
                        amount = credit - debit  # Credits are positive, debits are negative
                    elif 'amount' in mapped_df.columns:
                        amount = self._parse_amount(row.get('amount', 0))
                    
                    # Extract account number if available
                    account = row.get('account_number', row.get('account', filename))
                    if pd.notna(account):
                        account = str(account)
                        # Extract last 4 digits if it's a masked account number
                        if 'XXXXXX' in account:
                            account = account.replace('XXXXXX', '').replace('"', '').strip()
                    
                    transaction = {
                        'date': row['date'],
                        'description': str(row['description']),
                        'amount': amount,
                        'account': account,
                        'account_type': account_type
                    }
                    
                    # Detect transaction type
                    transaction_type = self.detect_transaction_type(transaction, account_type)
                    if transaction_type:
                        transaction['transaction_type'] = transaction_type
                    
                    transactions.append(self.normalize_transaction(transaction))
                except Exception as e:
                    print(f"Error parsing row: {e}")
                    continue
            
            return transactions
        except Exception as e:
            raise ValueError(f"Error parsing CSV: {e}")
    
    def _map_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map CSV columns to standard names"""
        mapped = {}
        
        for standard_name, possible_names in self.COLUMN_MAPPINGS.items():
            for col in df.columns:
                if col in possible_names or any(pn in col for pn in possible_names):
                    mapped[standard_name] = col
                    break
            
            if standard_name not in mapped:
                # Try to find by position if no match
                if standard_name == 'date' and len(df.columns) >= 1:
                    mapped[standard_name] = df.columns[0]
                elif standard_name == 'description' and len(df.columns) >= 2:
                    mapped[standard_name] = df.columns[1]
                elif standard_name == 'amount' and len(df.columns) >= 3:
                    mapped[standard_name] = df.columns[2]
        
        # Rename columns
        rename_dict = {v: k for k, v in mapped.items()}
        return df.rename(columns=rename_dict)
    
    def _parse_amount(self, value: Any) -> float:
        """Parse amount from various formats"""
        if pd.isna(value):
            return 0.0
        try:
            return float(str(value).replace(',', '').replace('$', ''))
        except:
            return 0.0
