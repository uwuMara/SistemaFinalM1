import os
import sys
import psycopg2

sys.path.append('backend')
from dotenv import load_dotenv
load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
print("Conectando a la base de datos para cerrar todas las sesiones activas...")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Ejecutamos la actualización para revocar todas las sesiones que estén activas
    cur.execute("""
        UPDATE active_sessions
        SET is_revoked = true
        WHERE is_revoked = false AND expires_at > now();
    """)
    
    affected_rows = cur.rowcount
    conn.commit()
    
    print(f"Éxito: Se han cerrado/revocado {affected_rows} sesiones activas.")
    
    cur.close()
    conn.close()
except Exception as e:
    print("Error al cerrar las sesiones:", e)
