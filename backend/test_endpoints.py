import sys
import os
import json
import urllib.request
import urllib.error

# Añadir el directorio actual al PATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.connection import get_connection

def test_endpoints():
    conn = get_connection()
    cur = conn.cursor()
    
    session_id = None
    try:
        # 1. Obtener o crear una sesión activa para pruebas
        cur.execute("""
            SELECT session_id 
            FROM active_sessions 
            WHERE is_revoked = false AND expires_at > now() 
            LIMIT 1
        """)
        row = cur.fetchone()
        if row:
            session_id = row[0]
            print(f"Usando sesión existente en la base de datos: {session_id}")
        else:
            # Intentar obtener un staff_id para crear sesión
            cur.execute("SELECT staff_id FROM staff_auth WHERE is_active = true LIMIT 1")
            row_staff = cur.fetchone()
            if row_staff:
                staff_id = row_staff[0]
                import uuid
                session_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO active_sessions (session_id, staff_id, ip_address, user_agent, expires_at)
                    VALUES (%s, %s, '127.0.0.1', 'TestScript', now() + interval '1 hour')
                """, (session_id, staff_id))
                conn.commit()
                print(f"Creada sesión temporal de prueba: {session_id}")
            else:
                print("Error: No se encontró ningún usuario activo en staff_auth para crear una sesión de prueba.")
                return
    except Exception as e:
        print(f"Error al preparar la sesión en la base de datos: {e}")
        return
    finally:
        cur.close()
        conn.close()

    # 2. Realizar petición HTTP al endpoint /auth/intrusion-alerts
    url_alerts = "http://127.0.0.1:8000/auth/intrusion-alerts"
    print(f"\nRealizando petición GET a {url_alerts}...")
    
    req = urllib.request.Request(url_alerts)
    req.add_header("X-Session-Id", session_id)
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print("\n--- RESPUESTA JSON DE /auth/intrusion-alerts ---")
            print(json.dumps(data, indent=4, ensure_ascii=False))
            print("-------------------------------------------------")
            
            # 3. Si hay eventos de intrusión abiertos, simular resolución del primero
            events = data.get("events", [])
            open_events = [e for e in events if e.get("status") == "OPEN"]
            if open_events:
                first_event = open_events[0]
                event_id = first_event["intrusion_id"]
                url_resolve = f"http://127.0.0.1:8000/auth/intrusion-events/{event_id}/resolve"
                print(f"\nProbando resolución del evento de intrusión ID {event_id}...")
                print(f"Realizando petición POST a {url_resolve}...")
                
                req_post = urllib.request.Request(url_resolve, method="POST")
                req_post.add_header("X-Session-Id", session_id)
                
                with urllib.request.urlopen(req_post) as response_res:
                    res_data = json.loads(response_res.read().decode())
                    print("\n--- RESPUESTA JSON DE RESOLUCIÓN ---")
                    print(json.dumps(res_data, indent=4, ensure_ascii=False))
                    print("-------------------------------------")
            else:
                print("\nNo se encontraron eventos de intrusión con estado 'OPEN' para probar la resolución.")
                
    except urllib.error.HTTPError as e:
        print(f"Error HTTP: {e.code} - {e.reason}")
        try:
            error_body = e.read().decode()
            print(f"Detalle del error: {error_body}")
        except:
            pass
    except Exception as e:
        print(f"Error al realizar la conexión: {e}")

if __name__ == "__main__":
    test_endpoints()
