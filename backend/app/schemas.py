from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    name: str
    email: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3b82f6"
    keywords: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    date: datetime
    description: str
    amount: float
    account: Optional[str] = None
    account_number: Optional[str] = None
    category_id: Optional[int] = None
    user_id: int
    is_recurring: bool = False
    recurring_pattern: Optional[str] = None
    notes: Optional[str] = None
    account_type: str = "checking"
    transaction_type: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    date: Optional[datetime] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    account: Optional[str] = None
    account_number: Optional[str] = None
    category_id: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurring_pattern: Optional[str] = None
    notes: Optional[str] = None
    account_type: Optional[str] = None
    transaction_type: Optional[str] = None

class Transaction(TransactionBase):
    id: Optional[int] = None
    original_filename: Optional[str] = None
    created_at: Optional[datetime] = None
    category: Optional[Category] = None
    
    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    message: str
    transactions_imported: int
    transactions: List[Transaction]

class AnalyticsSummary(BaseModel):
    total_spent: float
    total_income: float
    net_balance: float
    transaction_count: int
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

class CategorySpending(BaseModel):
    category_id: Optional[int]
    category_name: str
    amount: float
    transaction_count: int
    color: str

class SpendingOverTime(BaseModel):
    date: str
    amount: float

class RecurringPaymentSummary(BaseModel):
    description: str
    amount: float
    frequency: str
    next_expected_date: Optional[datetime]
