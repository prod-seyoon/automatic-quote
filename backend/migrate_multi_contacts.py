import sqlite3
import json

def migrate():
    conn = sqlite3.connect("crm.db")
    c = conn.cursor()
    
    # 1. Add representative_name
    try:
        c.execute("ALTER TABLE clients ADD COLUMN representative_name VARCHAR")
        print("Added representative_name.")
    except Exception as e:
        print(" representative_name maybe already exists:", e)
        
    # 2. Add contacts
    try:
        # SQLite doesn't natively enforce JSON type checking entirely if we don't need it, we can just use TEXT
        c.execute("ALTER TABLE clients ADD COLUMN contacts TEXT DEFAULT '[]'")
        print("Added contacts.")
    except Exception as e:
        print(" contacts maybe already exists:", e)
        
    # 3. Backfill contacts
    c.execute("SELECT id, customer_name, phone, email FROM clients")
    rows = c.fetchall()
    
    for row in rows:
        client_id, name, phone, email = row
        if not name and not phone and not email:
            contact = []
        else:
            contact = [{
                "name": name or "",
                "phone": phone or "",
                "email": email or "",
                "notes": "기본 담당자"
            }]
        c.execute("UPDATE clients SET contacts = ? WHERE id = ?", (json.dumps(contact, ensure_ascii=False), client_id))
        
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
