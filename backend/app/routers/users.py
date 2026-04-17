from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, User
from app.services.user_preferences import UserPreferencesService

router = APIRouter()
preferences_service = UserPreferencesService()

@router.post("/", response_model=User)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user with same email exists
    if user.email:
        existing_user = db.query(User).filter(User.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
    
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Initialize user preferences
    preferences_service._create_default_preferences(db_user.id)
    
    return db_user

@router.get("/", response_model=List[User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/{user_id}/preferences")
def get_user_preferences(user_id: int):
    """Get user's categorization preferences"""
    return preferences_service.get_preferences(user_id)

@router.post("/{user_id}/preferences/mapping")
def add_mapping(
    user_id: int,
    mapping_type: str,  # "keyword", "sender", or "pattern"
    key: str,
    category_id: int
):
    """Add a categorization mapping for a user"""
    if mapping_type == "keyword":
        preferences_service.add_keyword_mapping(user_id, key, category_id)
    elif mapping_type == "sender":
        preferences_service.add_sender_mapping(user_id, key, category_id)
    elif mapping_type == "pattern":
        preferences_service.add_pattern_mapping(user_id, key, category_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid mapping type")
    
    return {"message": "Mapping added successfully"}

@router.delete("/{user_id}/preferences/mapping")
def delete_mapping(user_id: int, mapping_type: str, key: str):
    """Delete a categorization mapping"""
    preferences_service.delete_mapping(user_id, mapping_type, key)
    return {"message": "Mapping deleted successfully"}
