import sys
import os

# Añadir el directorio actual al PATH para poder importar app correctamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.connection import get_connection

def clean_database():
    print("Conectando a la base de datos para limpiar el historial...")
    conn = get_connection()
    cur = conn.cursor()
    try:
        # 1. Eliminar todas las sesiones activas
        cur.execute("TRUNCATE TABLE active_sessions CASCADE;")
        print("- Tabla active_sessions truncada (sesiones limpiadas).")

        # 2. Eliminar todos los eventos de intrusión
        cur.execute("TRUNCATE TABLE intrusion_events CASCADE;")
        print("- Tabla intrusion_events truncada (alertas de intrusos eliminadas).")

        # 3. Eliminar el historial completo de auditoría
        cur.execute("TRUNCATE TABLE login_audit CASCADE;")
        print("- Tabla login_audit truncada (historial de accesos eliminado).")

        # 4. Reactivar todas las cuentas de usuario y resetear contadores de fallos
        cur.execute("""
            UPDATE staff_auth
            SET is_active = true, failed_attempts = 0, locked_until = NULL;
        """)
        print("- Cuentas de usuario reactivadas y contadores de intentos fallidos reseteados a 0.")

        conn.commit()
        print("\n¡Limpieza de historial de accesos completada con éxito!")
    except Exception as e:
        conn.rollback()
        print(f"\nError durante la limpieza: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    clean_database()
