import json
import os
from typing import Dict, List, Optional
from pathlib import Path

class UserPreferencesService:
    """Service for managing user-specific categorization preferences in JSON files"""
    
    def __init__(self, base_dir: str = "user_preferences"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
    
    def _get_user_file(self, user_id: int) -> Path:
        """Get the JSON file path for a user"""
        return self.base_dir / f"user_{user_id}_preferences.json"
    
    def get_preferences(self, user_id: int) -> Dict:
        """Get user's categorization preferences"""
        file_path = self._get_user_file(user_id)
        if not file_path.exists():
            return self._create_default_preferences(user_id)
        
        with open(file_path, 'r') as f:
            return json.load(f)
    
    def _create_default_preferences(self, user_id: int) -> Dict:
        """Create default preferences for a new user"""
        default = {
            "user_id": user_id,
            "categorization_rules": {
                # keyword -> category_id mapping
                "keyword_mappings": {},
                # sender/merchant -> category_id mapping
                "sender_mappings": {},
                # pattern -> category_id mapping (regex)
                "pattern_mappings": {}
            },
            "auto_learn": True,  # Whether to learn from manual categorizations
            "default_categories": {
                "food": ["restaurant", "cafe", "diner", "grill", "bistro", "eatery", "mcdonald", "starbucks", "burger king", "subway"],
                "entertainment": ["netflix", "spotify", "hulu", "disney", "amazon prime", "youtube", "gaming"],
                "utilities": ["electric", "water", "gas", "internet", "phone", "utility"],
                "shopping": ["amazon", "walmart", "target", "costco", "best buy", "ebay"],
                "transportation": ["uber", "lyft", "gas station", "parking", "metro", "bus", "train"],
                "groceries": ["grocery", "supermarket", "whole foods", "trader joe", "kroger", "safeway"],
                "health": ["pharmacy", "doctor", "hospital", "dental", "medical", "gym"],
                "income": ["salary", "payroll", "deposit", "transfer in", "refund"]
            }
        }
        self.save_preferences(user_id, default)
        return default
    
    def save_preferences(self, user_id: int, preferences: Dict):
        """Save user's preferences to JSON file"""
        file_path = self._get_user_file(user_id)
        with open(file_path, 'w') as f:
            json.dump(preferences, f, indent=2)
    
    def add_keyword_mapping(self, user_id: int, keyword: str, category_id: int):
        """Add a keyword -> category mapping"""
        preferences = self.get_preferences(user_id)
        preferences["categorization_rules"]["keyword_mappings"][keyword.lower()] = category_id
        self.save_preferences(user_id, preferences)
    
    def add_sender_mapping(self, user_id: int, sender: str, category_id: int):
        """Add a sender/merchant -> category mapping"""
        preferences = self.get_preferences(user_id)
        preferences["categorization_rules"]["sender_mappings"][sender.lower()] = category_id
        self.save_preferences(user_id, preferences)
    
    def add_pattern_mapping(self, user_id: int, pattern: str, category_id: int):
        """Add a regex pattern -> category mapping"""
        preferences = self.get_preferences(user_id)
        preferences["categorization_rules"]["pattern_mappings"][pattern] = category_id
        self.save_preferences(user_id, preferences)
    
    def find_category_by_keywords(self, user_id: int, description: str, categories: List) -> Optional[int]:
        """Find category ID based on user's keyword mappings"""
        preferences = self.get_preferences(user_id)
        keyword_mappings = preferences["categorization_rules"]["keyword_mappings"]
        sender_mappings = preferences["categorization_rules"]["sender_mappings"]
        
        description_lower = description.lower()
        
        # Check keyword mappings first
        for keyword, category_id in keyword_mappings.items():
            if keyword in description_lower:
                return category_id
        
        # Check sender mappings
        for sender, category_id in sender_mappings.items():
            if sender in description_lower:
                return category_id
        
        # Check pattern mappings (regex)
        import re
        pattern_mappings = preferences["categorization_rules"]["pattern_mappings"]
        for pattern, category_id in pattern_mappings.items():
            if re.search(pattern, description, re.IGNORECASE):
                return category_id
        
        return None
    
    def learn_from_categorization(self, user_id: int, description: str, category_id: int):
        """Learn from manual categorization by extracting keywords"""
        preferences = self.get_preferences(user_id)
        
        if not preferences.get("auto_learn", True):
            return
        
        # Extract potential keywords from description
        # Simple approach: use the first word or common merchant names
        words = description.lower().split()
        
        # Add first word as keyword if it's meaningful (length > 3)
        if len(words) > 0 and len(words[0]) > 3:
            self.add_keyword_mapping(user_id, words[0], category_id)
        
        # Also add the full description as a sender mapping if it's short enough
        if len(description) < 30:
            self.add_sender_mapping(user_id, description, category_id)
    
    def get_all_mappings(self, user_id: int) -> Dict:
        """Get all categorization mappings for a user"""
        preferences = self.get_preferences(user_id)
        return preferences["categorization_rules"]
    
    def delete_mapping(self, user_id: int, mapping_type: str, key: str):
        """Delete a specific mapping"""
        preferences = self.get_preferences(user_id)
        if mapping_type in preferences["categorization_rules"]:
            if key in preferences["categorization_rules"][mapping_type]:
                del preferences["categorization_rules"][mapping_type][key]
                self.save_preferences(user_id, preferences)
