from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Category
from app.schemas import CategoryCreate, Category

router = APIRouter()

@router.post("/", response_model=Category)
def create_category(category: CategoryCreate, user_id: int, db: Session = Depends(get_db)):
    # Check if category with same name exists for this user
    db_category = db.query(Category).filter(
        Category.name == category.name,
        Category.user_id == user_id
    ).first()
    if db_category:
        raise HTTPException(status_code=400, detail="Category already exists for this user")
    
    db_category = Category(**category.dict(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[Category])
def get_categories(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.user_id == user_id).offset(skip).limit(limit).all()
    return categories

@router.get("/{category_id}", response_model=Category)
def get_category(category_id: int, user_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == user_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.put("/{category_id}", response_model=Category)
def update_category(category_id: int, category: CategoryCreate, user_id: int, db: Session = Depends(get_db)):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == user_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category.dict().items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(category_id: int, user_id: int, db: Session = Depends(get_db)):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == user_id
    ).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted successfully"}
