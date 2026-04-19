from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    categories = relationship("Category", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    accounts = relationship("Account", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6")  # Hex color for charts
    keywords = Column(Text, nullable=True)  # Comma-separated keywords for auto-categorization
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Chase Checking", "Chase Credit Card"
    account_type = Column(String, nullable=False)  # "checking", "credit_card", "savings"
    account_number = Column(String, nullable=True)  # Last 4 digits
    balance = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    description = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    account_name = Column(String, nullable=True)  # Bank account name (legacy, will be migrated)
    account_number = Column(String, nullable=True)  # Last 4 digits of account number (legacy)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)  # New foreign key
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_recurring = Column(Boolean, default=False, index=True)
    recurring_pattern = Column(String, nullable=True)  # e.g., "monthly", "weekly"
    original_filename = Column(String, nullable=True)  # Source file
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    account_type = Column(String, default="checking")  # "checking" or "credit_card" (legacy)
    transaction_type = Column(String, nullable=True)  # "purchase", "payment", "deposit", "withdrawal", "transfer"
    status = Column(String, default="Posted")  # "Posted" or "Pending"
    
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")

class RecurringPayment(Base):
    __tablename__ = "recurring_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    description_pattern = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=True)  # None if amount varies
    frequency = Column(String, nullable=False)  # "monthly", "weekly", "biweekly", "yearly"
    next_expected_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
