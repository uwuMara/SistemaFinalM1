import os
import sys
import psycopg2
import urllib.request
import urllib.error

sys.path.append('backend')
from dotenv import load_dotenv
load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("""
        SELECT session_id 
        FROM active_sessions 
        WHERE is_revoked = false AND expires_at > now() 
        LIMIT 1;
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        print("No active session found in DB to test with.")
    else:
        session_id = row[0]
        print("Testing with active session ID:", session_id)
        url = "http://127.0.0.1:8000/auth/audit"
        req = urllib.request.Request(url)
        req.add_header("X-Session-Id", session_id)
        
        try:
            response = urllib.request.urlopen(req)
            print("HTTP STATUS:", response.status)
            print("RESPONSE:", response.read().decode()[:500])
        except urllib.error.HTTPError as e:
            print("HTTP ERROR:", e.code, e.read().decode())
except Exception as e:
    print("ERROR:", e)
