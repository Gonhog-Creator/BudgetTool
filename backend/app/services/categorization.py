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
        """Find matching category based on keywords with improved accuracy"""
        description_lower = description.lower()
        description_words = set(description_lower.split())
        
        best_match = None
        best_score = 0
        
        for category in categories:
            if category.keywords:
                keywords = [k.strip().lower() for k in category.keywords.split(',')]
                score = 0
                matched_keywords = []
                
                for keyword in keywords:
                    # Check for exact word match (higher priority)
                    if keyword in description_words:
                        score += 2
                        matched_keywords.append(keyword)
                    # Check for substring match (lower priority)
                    elif keyword in description_lower:
                        score += 1
                        matched_keywords.append(keyword)
                
                if score > best_score:
                    best_score = score
                    best_match = category.id
        
        return best_match if best_score > 0 else None
    
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
