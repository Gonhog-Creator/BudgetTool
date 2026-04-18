from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.database import get_db
from app.models import Transaction, Category
from app.schemas import AnalyticsSummary, CategorySpending, SpendingOverTime, RecurringPaymentSummary

router = APIRouter()

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    user_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    transactions = query.all()
    
    total_spent = sum(t.amount for t in transactions if t.amount < 0)
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    net_balance = total_income - abs(total_spent)
    
    return AnalyticsSummary(
        total_spent=abs(total_spent),
        total_income=total_income,
        net_balance=net_balance,
        transaction_count=len(transactions),
        period_start=start_date,
        period_end=end_date
    )

@router.get("/by-category", response_model=List[CategorySpending])
def get_spending_by_category(
    user_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    # Don't set default dates - show all transactions unless explicitly filtered
    
    filters = [Category.user_id == user_id]
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    
    # Exclude Credit Card Payment category from spending calculations
    filters.append(Category.name != "Credit Card Payment")
    
    results = db.query(
        Category.id.label("category_id"),
        Category.name.label("category_name"),
        Category.color.label("color"),
        func.sum(Transaction.amount).label("amount"),
        func.count(Transaction.id).label("transaction_count")
    ).outerjoin(
        Transaction, Category.id == Transaction.category_id
    ).filter(
        and_(*filters)
    ).group_by(Category.id).all()
    
    return [
        CategorySpending(
            category_id=r.category_id,
            category_name=r.category_name or "Uncategorized",
            amount=abs(r.amount) if r.amount else 0,
            transaction_count=r.transaction_count,
            color=r.color
        )
        for r in results
    ]

@router.get("/over-time", response_model=List[SpendingOverTime])
def get_spending_over_time(
    user_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    group_by: str = Query("day", description="Group by: day, week, month"),
    db: Session = Depends(get_db)
):
    # Don't set default dates - show all transactions unless explicitly filtered
    
    if group_by == "month":
        date_format = func.strftime("%Y-%m", Transaction.date)
    elif group_by == "week":
        date_format = func.strftime("%Y-W%W", Transaction.date)
    else:  # day
        date_format = func.date(Transaction.date)
    
    filters = [Transaction.user_id == user_id]
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    
    results = db.query(
        date_format.label("date"),
        func.sum(Transaction.amount).label("amount")
    ).filter(
        and_(*filters)
    ).group_by(date_format).order_by(date_format).all()
    
    return [
        SpendingOverTime(
            date=str(r.date),
            amount=abs(r.amount) if r.amount else 0
        )
        for r in results
    ]

@router.get("/recurring", response_model=List[RecurringPaymentSummary])
def get_recurring_payments(
    user_id: int,
    db: Session = Depends(get_db)
):
    transactions = db.query(Transaction).filter(
        and_(
            Transaction.user_id == user_id,
            Transaction.is_recurring == True
        )
    ).all()
    
    # Group by description pattern
    from collections import defaultdict
    grouped = defaultdict(list)
    for t in transactions:
        grouped[t.description].append(t)
    
    summaries = []
    for description, txs in grouped.items():
        latest = max(txs, key=lambda x: x.date)
        summaries.append(
            RecurringPaymentSummary(
                description=description,
                amount=latest.amount,
                frequency=latest.recurring_pattern or "unknown",
                next_expected_date=latest.date
            )
        )
    
    return summaries

@router.get("/category-by-month")
def get_category_spending_by_month(
    user_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get spending breakdown by category for each month"""
    if not start_date:
        start_date = datetime.now() - timedelta(days=90)  # Last 3 months
    if not end_date:
        end_date = datetime.now()
    
    results = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        Category.id.label("category_id"),
        Category.name.label("category_name"),
        Category.color.label("color"),
        func.sum(Transaction.amount).label("amount")
    ).outerjoin(
        Category, Category.id == Transaction.category_id
    ).filter(
        and_(
            Category.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        )
    ).group_by(
        func.strftime("%Y-%m", Transaction.date),
        Category.id
    ).order_by(
        func.strftime("%Y-%m", Transaction.date)
    ).all()
    
    # Group by month
    monthly_data: Dict[str, List[Dict[str, Any]]] = {}
    for r in results:
        month = r.month
        if month not in monthly_data:
            monthly_data[month] = []
        monthly_data[month].append({
            "category_id": r.category_id,
            "category_name": r.category_name or "Uncategorized",
            "color": r.color,
            "amount": abs(r.amount) if r.amount else 0
        })
    
    return monthly_data
