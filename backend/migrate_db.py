"""
Migration script to add missing columns to transactions table
"""
import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'budget.db')
    
    if not os.path.exists(db_path):
        print("Database not found. No migration needed.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check existing columns
        cursor.execute("PRAGMA table_info(transactions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add account_type column
        if 'account_type' not in columns:
            print("Adding account_type column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_type TEXT DEFAULT 'checking'")
            print("[OK] account_type column added")
        else:
            print("[OK] account_type column already exists")
        
        # Add transaction_type column
        if 'transaction_type' not in columns:
            print("Adding transaction_type column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN transaction_type TEXT")
            print("[OK] transaction_type column added")
        else:
            print("[OK] transaction_type column already exists")
        
        # Add original_filename column
        if 'original_filename' not in columns:
            print("Adding original_filename column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN original_filename TEXT")
            print("[OK] original_filename column added")
        else:
            print("[OK] original_filename column already exists")
        
        # Add account_number column
        if 'account_number' not in columns:
            print("Adding account_number column...")
            cursor.execute("ALTER TABLE transactions ADD COLUMN account_number TEXT")
            print("[OK] account_number column added")
        else:
            print("[OK] account_number column already exists")
        
        conn.commit()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
