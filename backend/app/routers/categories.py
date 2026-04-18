from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Category as CategoryModel, Transaction as TransactionModel
from app.schemas import CategoryCreate, Category
from app.services.categorization import CategorizationService

router = APIRouter()
categorization_service = CategorizationService()

@router.post("/", response_model=Category)
def create_category(category: CategoryCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if category with same name exists for this user
    db_category = db.query(CategoryModel).filter(
        CategoryModel.name == category.name,
        CategoryModel.user_id == user_id
    ).first()
    if db_category:
        raise HTTPException(status_code=400, detail="Category already exists for this user")
    
    db_category = CategoryModel(**category.model_dump(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[Category])
def get_categories(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = db.query(CategoryModel).filter(CategoryModel.user_id == user_id).offset(skip).limit(limit).all()
    return categories

@router.get("/{category_id}", response_model=Category)
def get_category(category_id: int, user_id: int, db: Session = Depends(get_db)):
    category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.user_id == user_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.put("/{category_id}", response_model=Category)
def update_category(category_id: int, category: CategoryCreate, user_id: int, db: Session = Depends(get_db)):
    db_category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.user_id == user_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.model_dump().items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(category_id: int, user_id: int, db: Session = Depends(get_db)):
    db_category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.user_id == user_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}

@router.post("/auto-categorize")
def auto_categorize(user_id: int, db: Session = Depends(get_db)):
    """Auto-categorize all uncategorized transactions for a user. Creates default categories if none exist."""
    # Check if user has any categories
    existing_categories = db.query(CategoryModel).filter(CategoryModel.user_id == user_id).all()
    
    if not existing_categories:
        # Create default categories
        default_categories = [
            {
                "name": "Food & Dining",
                "description": "Restaurants, groceries, food delivery",
                "color": "#ef4444",
                "keywords": "restaurant, food, dining, grocery, supermarket, walmart, target, whole foods, trader joe's, costco, publix, kroger, albertsons, safeway, meal, lunch, dinner, breakfast, cafe, coffee, starbucks, dunkin, mcdonald, burger king, taco bell, subway, chipotle, panera, doordash, uber eats, grubhub, instacart, hellofresh, blue apron, chickfile, bojangles, cookout"
            },
            {
                "name": "Travel",
                "description": "Flights, hotels, car rentals, travel booking",
                "color": "#3b82f6",
                "keywords": "airline, flight, delta, american, southwest, jetblue, united, hotel, airbnb, booking, expedia, priceline, travel, vacation, trip, cruise, rental car, uber, lyft, taxi, gas station, shell, chevron, exxon, bp, mobil"
            },
            {
                "name": "Savings & Investments",
                "description": "Transfers to savings accounts, Fidelity, Coinbase, Vanguard",
                "color": "#10b981",
                "keywords": "fidelity, coinbase, vanguard, schwab, etrade, robinhood, webull, cash app, venmo, paypal, transfer, savings, investment, 401k, ira, roth, brokerage, stock, crypto, bitcoin, ethereum, deposit, contribution"
            },
            {
                "name": "Shopping",
                "description": "Online shopping, retail stores, Amazon",
                "color": "#f59e0b",
                "keywords": "amazon, walmart, target, best buy, ebay, etsy, shopify, apple, microsoft, google, sony, nintendo, fashion, clothing, shoes, accessories, makeup, cosmetics, sephora, ulta, nordstrom, macy's, kohl's, tj maxx, marshalls, ross"
            },
            {
                "name": "Entertainment",
                "description": "Streaming services, movies, games, concerts",
                "color": "#8b5cf6",
                "keywords": "netflix, hulu, disney, hbo, spotify, apple music, youtube, prime video, movie, theater, concert, game, playstation, xbox, nintendo, steam, twitch, patreon"
            },
            {
                "name": "Bills & Utilities",
                "description": "Electric, water, internet, phone, insurance",
                "color": "#ec4899",
                "keywords": "electric, water, gas, internet, wifi, phone, mobile, verizon, at&t, t-mobile, sprint, insurance, health, dental, vision, car, home, rent, mortgage, property tax, trash, recycling"
            },
            {
                "name": "Healthcare",
                "description": "Doctors, pharmacies, medical expenses",
                "color": "#06b6d4",
                "keywords": "doctor, hospital, clinic, pharmacy, cvs, walgreens, rite aid, medical, dental, vision, therapy, fitness, gym, health, wellness, supplement, vitamin"
            },
            {
                "name": "Transportation",
                "description": "Public transit, parking, tolls, car maintenance",
                "color": "#84cc16",
                "keywords": "bus, train, subway, metro, parking, toll, car, auto, mechanic, repair, maintenance, oil change, tire, battery, registration, inspection"
            },
            {
                "name": "Gas",
                "description": "Gas station fuel purchases",
                "color": "#f97316",
                "keywords": "gas, fuel, shell, chevron, exxon, mobil, bp, texaco, circle k, 7-eleven, station, petroleum"
            },
            {
                "name": "Foreign Transaction Fee",
                "description": "Foreign transaction fees and currency conversion fees",
                "color": "#6366f1",
                "keywords": "foreign transaction fee, international fee, currency fee, fx fee, conversion fee, foreign exchange"
            },
            {
                "name": "Credit Card Payment",
                "description": "Credit card payments and bill payments",
                "color": "#14b8a6",
                "keywords": "electronic pmt, ach credit, ach debit, online payment, web payment, bill pay, automatic payment, recurring payment, credit card payment, card payment, online transfer, transfer from, payment to, cc payment, payment to credit card, credit card, visa, mastercard, amex, discover, capital one, chase, citi, bank of america, wells fargo"
            },
            {
                "name": "Income",
                "description": "Salary, bonuses, dividends, and other income sources",
                "color": "#22c55e",
                "keywords": "salary, payroll, direct deposit, paycheck, bonus, commission, dividend, interest, refund, reimbursement, stipend, grant, scholarship, social security, pension, annuity, royalty, rent income, investment income, capital gains, gift, transfer in, deposit in"
            }
        ]
        
        for cat_data in default_categories:
            db_category = CategoryModel(
                name=cat_data["name"],
                description=cat_data["description"],
                color=cat_data["color"],
                keywords=cat_data["keywords"],
                user_id=user_id
            )
            db.add(db_category)
        
        db.commit()
    
    # Get all uncategorized transactions
    uncategorized_transactions = db.query(TransactionModel).filter(
        TransactionModel.user_id == user_id,
        TransactionModel.category_id.is_(None)
    ).all()
    
    # Get all categories for this user
    categories = db.query(CategoryModel).filter(CategoryModel.user_id == user_id).all()
    
    categorized_count = 0
    for transaction in uncategorized_transactions:
        # Find matching category based on keywords
        category_id = categorization_service._find_category(transaction.description, categories)
        if category_id:
            transaction.category_id = category_id
            categorized_count += 1
    
    db.commit()
    return {
        "message": f"Auto-categorized {categorized_count} transactions",
        "categorized_count": categorized_count
    }

@router.post("/re-auto-categorize")
def re_auto_categorize(user_id: int, db: Session = Depends(get_db)):
    """Remove default categories and recreate them, then re-auto-categorize all transactions."""
    # Define default category names
    default_category_names = [
        "Food & Dining",
        "Travel",
        "Savings & Investments",
        "Shopping",
        "Entertainment",
        "Bills & Utilities",
        "Healthcare",
        "Transportation",
        "Gas",
        "Foreign Transaction Fee",
        "Credit Card Payment",
        "Income"
    ]
    
    print(f"DEBUG: Starting re-auto-categorize for user {user_id}")
    print(f"DEBUG: Default category names: {default_category_names}")
    
    # Remove default categories (but keep user-created ones)
    deleted_count = db.query(CategoryModel).filter(
        CategoryModel.user_id == user_id,
        CategoryModel.name.in_(default_category_names)
    ).delete(synchronize_session=False)
    
    print(f"DEBUG: Deleted {deleted_count} default categories")
    
    # Uncategorize transactions that were categorized with default categories
    # (Since we deleted the categories, those transactions will now be uncategorized)
    
    # Recreate default categories
    default_categories = [
        {
            "name": "Food & Dining",
            "description": "Restaurants, groceries, food delivery",
            "color": "#ef4444",
            "keywords": "restaurant, food, dining, grocery, supermarket, walmart, target, whole foods, trader joe's, costco, publix, kroger, albertsons, safeway, meal, lunch, dinner, breakfast, cafe, coffee, starbucks, dunkin, mcdonald, burger king, taco bell, subway, chipotle, panera, doordash, uber eats, grubhub, instacart, hellofresh, blue apron, chickfile, bojangles, cookout"
        },
        {
            "name": "Travel",
            "description": "Flights, hotels, car rentals, travel booking",
            "color": "#3b82f6",
            "keywords": "airline, flight, delta, american, southwest, jetblue, united, hotel, airbnb, booking, expedia, priceline, travel, vacation, trip, cruise, rental car, uber, lyft, taxi, gas station, shell, chevron, exxon, bp, mobil"
        },
        {
            "name": "Savings & Investments",
            "description": "Transfers to savings accounts, Fidelity, Coinbase, Vanguard",
            "color": "#10b981",
            "keywords": "fidelity, coinbase, vanguard, schwab, etrade, robinhood, webull, cash app, venmo, paypal, transfer, savings, investment, 401k, ira, roth, brokerage, stock, crypto, bitcoin, ethereum, deposit, contribution"
        },
        {
            "name": "Shopping",
            "description": "Online shopping, retail stores, Amazon",
            "color": "#f59e0b",
            "keywords": "amazon, walmart, target, best buy, ebay, etsy, shopify, apple, microsoft, google, sony, nintendo, fashion, clothing, shoes, accessories, makeup, cosmetics, sephora, ulta, nordstrom, macy's, kohl's, tj maxx, marshalls, ross"
        },
        {
            "name": "Entertainment",
            "description": "Streaming services, movies, games, concerts",
            "color": "#8b5cf6",
            "keywords": "netflix, hulu, disney, hbo, spotify, apple music, youtube, prime video, movie, theater, concert, game, playstation, xbox, nintendo, steam, twitch, patreon"
        },
        {
            "name": "Bills & Utilities",
            "description": "Electric, water, internet, phone, insurance",
            "color": "#ec4899",
            "keywords": "electric, water, gas, internet, wifi, phone, mobile, verizon, at&t, t-mobile, sprint, insurance, health, dental, vision, car, home, rent, mortgage, property tax, trash, recycling"
        },
        {
            "name": "Healthcare",
            "description": "Doctors, pharmacies, medical expenses",
            "color": "#06b6d4",
            "keywords": "doctor, hospital, clinic, pharmacy, cvs, walgreens, rite aid, medical, dental, vision, therapy, fitness, gym, health, wellness, supplement, vitamin"
        },
        {
            "name": "Transportation",
            "description": "Public transit, parking, tolls, car maintenance",
            "color": "#84cc16",
            "keywords": "bus, train, subway, metro, parking, toll, car, auto, mechanic, repair, maintenance, oil change, tire, battery, registration, inspection"
        },
        {
            "name": "Gas",
            "description": "Gas station fuel purchases",
            "color": "#f97316",
            "keywords": "gas, fuel, shell, chevron, exxon, mobil, bp, texaco, circle k, 7-eleven, station, petroleum"
        },
        {
            "name": "Foreign Transaction Fee",
            "description": "Foreign transaction fees and currency conversion fees",
            "color": "#6366f1",
            "keywords": "foreign transaction fee, international fee, currency fee, fx fee, conversion fee, foreign exchange"
        },
        {
            "name": "Credit Card Payment",
            "description": "Credit card payments and bill payments",
            "color": "#14b8a6",
            "keywords": "electronic pmt, ach credit, ach debit, online payment, web payment, bill pay, automatic payment, recurring payment, credit card payment, card payment, online transfer, transfer from, payment to, cc payment, payment to credit card, credit card, visa, mastercard, amex, discover, capital one, chase, citi, bank of america, wells fargo"
        },
        {
            "name": "Income",
            "description": "Salary, bonuses, dividends, and other income sources",
            "color": "#22c55e",
            "keywords": "salary, payroll, direct deposit, paycheck, bonus, commission, dividend, interest, refund, reimbursement, stipend, grant, scholarship, social security, pension, annuity, royalty, rent income, investment income, capital gains, gift, transfer in, deposit in"
        }
    ]
    
    for cat_data in default_categories:
        db_category = CategoryModel(
            name=cat_data["name"],
            description=cat_data["description"],
            color=cat_data["color"],
            keywords=cat_data["keywords"],
            user_id=user_id
        )
        db.add(db_category)
        print(f"DEBUG: Adding category: {cat_data['name']}")
    
    db.commit()
    print(f"DEBUG: Committed {len(default_categories)} new categories")
    
    # Get all transactions (not just uncategorized) to re-categorize everything
    all_transactions = db.query(TransactionModel).filter(TransactionModel.user_id == user_id).all()
    
    # Get all categories for this user
    categories = db.query(CategoryModel).filter(CategoryModel.user_id == user_id).all()
    
    categorized_count = 0
    for transaction in all_transactions:
        # Find matching category based on keywords
        category_id = categorization_service._find_category(transaction.description, categories)
        if category_id:
            transaction.category_id = category_id
            categorized_count += 1
    
    db.commit()
    print(f"DEBUG: Re-categorized {categorized_count} transactions")
    
    # Check if Credit Card Payment category was created
    cc_category = db.query(CategoryModel).filter(
        CategoryModel.user_id == user_id,
        CategoryModel.name == "Credit Card Payment"
    ).first()
    print(f"DEBUG: Credit Card Payment category exists: {cc_category is not None}")
    if cc_category:
        print(f"DEBUG: CC Category ID: {cc_category.id}, Keywords: {cc_category.keywords}")
    
    # Check if Income category was created
    income_category = db.query(CategoryModel).filter(
        CategoryModel.user_id == user_id,
        CategoryModel.name == "Income"
    ).first()
    print(f"DEBUG: Income category exists: {income_category is not None}")
    if income_category:
        print(f"DEBUG: Income Category ID: {income_category.id}, Keywords: {income_category.keywords}")
    
    return {
        "message": f"Removed {deleted_count} default categories and re-categorized {categorized_count} transactions",
        "deleted_count": deleted_count,
        "categorized_count": categorized_count
    }
