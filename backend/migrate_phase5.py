import sqlite3

def migrate():
    conn = sqlite3.connect('crm.db')
    cursor = conn.cursor()
    
    # Check if columns exist
    cursor.execute("PRAGMA table_info(clients)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'address' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN address TEXT")
        print("Added 'address' column")
    
    if 'business_type' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN business_type TEXT")
        print("Added 'business_type' column")
        
    if 'business_item' not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN business_item TEXT")
        print("Added 'business_item' column")
        
    conn.commit()
    conn.close()
    print("Migration Phase 5 completed.")

if __name__ == "__main__":
    migrate()
