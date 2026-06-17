import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.connection import get_connection

def activate_all_users():
    print("Conectando a la base de datos...")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE staff_auth SET is_active = true")
        conn.commit()
        print("Éxito: Todos los usuarios han sido activados (is_active = true) en la tabla staff_auth.")
    except Exception as e:
        print("Error al activar usuarios:", e)
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    activate_all_users()
