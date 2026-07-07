import os
import sys
sys.path.append('backend')
from dotenv import load_dotenv
load_dotenv('backend/.env')
import psycopg2

try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    cur.execute("""
        SELECT COALESCE(json_agg(t), '[]'::json)
        FROM (
            SELECT login_id, staff_id, username, COALESCE(ip_address, 'Desconocido') AS ip_address, 
                   COALESCE(user_agent, 'Desconocido') AS user_agent, success, reason, 
                   attempted_at::text AS attempted_at
            FROM login_audit
            ORDER BY attempted_at DESC
        ) t
    """)
    res = cur.fetchone()[0]
    print("SUCCESS:", type(res), res[:200] if isinstance(res, str) else str(res)[:200])
    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)
