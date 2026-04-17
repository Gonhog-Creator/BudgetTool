from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models import Category
from app.services.user_preferences import UserPreferencesService
import re

class CategorizationService:
    """Service for auto-categorizing transactions"""
    
    def __init__(self):
        self.preferences_service = UserPreferencesService()
    
    def categorize_transactions(
        self, 
        transactions: List[Dict[str, Any]], 
        db: Session,
        user_id: int
    ) -> List[Dict[str, Any]]:
        """Auto-categorize a list of transactions for a specific user"""
        categories = db.query(Category).filter(Category.user_id == user_id).all()
        
        categorized = []
        for tx in transactions:
            # First check user's learned preferences
            category_id = self.preferences_service.find_category_by_keywords(
                user_id, tx['description'], categories
            )
            
            # If no match in preferences, check category keywords
            if not category_id:
                category_id = self._find_category(tx['description'], categories)
            
            tx['category_id'] = category_id
            categorized.append(tx)
        
        return categorized
    
    def _find_category(self, description: str, categories: List[Category]) -> int:
        """Find matching category based on keywords"""
        description_lower = description.lower()
        
        for category in categories:
            if category.keywords:
                keywords = [k.strip().lower() for k in category.keywords.split(',')]
                for keyword in keywords:
                    if keyword in description_lower:
                        return category.id
        
        return None  # Uncategorized
    
    def suggest_category(self, description: str, db: Session, user_id: int) -> Category:
        """Suggest a category for a transaction description"""
        categories = db.query(Category).filter(Category.user_id == user_id).all()
        
        # First check user's learned preferences
        category_id = self.preferences_service.find_category_by_keywords(
            user_id, description, categories
        )
        
        # If no match, check category keywords
        if not category_id:
            category_id = self._find_category(description, categories)
        
        if category_id:
            return db.query(Category).filter(Category.id == category_id).first()
        return None
    
    def learn_from_manual_categorization(self, user_id: int, description: str, category_id: int):
        """Learn from manual categorization by updating user preferences"""
        self.preferences_service.learn_from_categorization(user_id, description, category_id)
