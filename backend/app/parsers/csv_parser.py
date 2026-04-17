from typing import List, Dict, Any
import pandas as pd
import io
from app.parsers.base_parser import BaseParser

class CSVParser(BaseParser):
    """Parser for CSV bank statements"""
    
    # Common column name mappings
    COLUMN_MAPPINGS = {
        'date': ['date', 'transaction date', 'posted date', 'transactiondate', 'posteddate', 'dt'],
        'description': ['description', 'description', 'merchant', 'payee', 'transaction', 'details', 'memo'],
        'amount': ['amount', 'debit', 'credit', 'transaction amount', 'amount', 'value'],
        'account': ['account', 'account number', 'bank account', 'account #'],
    }
    
    def can_parse(self, filename: str, content: bytes) -> bool:
        return filename.lower().endswith('.csv')
    
    def parse(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        try:
            # Read CSV with pandas
            df = pd.read_csv(io.BytesIO(content))
            
            # Normalize column names
            df.columns = [col.strip().lower() for col in df.columns]
            
            # Map columns to standard names
            mapped_df = self._map_columns(df)
            
            transactions = []
            for _, row in mapped_df.iterrows():
                try:
                    transaction = {
                        'date': row['date'],
                        'description': str(row['description']),
                        'amount': self._parse_amount(row['amount']),
                        'account': row.get('account', filename),
                    }
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
