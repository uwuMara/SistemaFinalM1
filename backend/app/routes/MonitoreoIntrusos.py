import uuid
from fastapi import APIRouter, HTTPException, Depends
from app.db.connection import get_connection
from app.dependencies import get_current_active_session

router = APIRouter(prefix="/auth", tags=["Monitoreo de Intrusos"])


def create_session(cur, staff_id: int, ip_address: str, user_agent: str) -> str:
    session_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO active_sessions (session_id, staff_id, ip_address, user_agent, expires_at)
        VALUES (%s, %s, %s, %s, now() + interval '24 hours')
    """, (session_id, staff_id, ip_address, user_agent))
    return session_id


def close_session(cur, session_id: str):
    cur.execute("""
        UPDATE active_sessions
        SET is_revoked = true
        WHERE session_id = %s
    """, (session_id,))


@router.get("/sessions")
def get_active_sessions(staff_id: int = None, active_only: bool = True, current_staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT 
            asess.session_id,
            asess.staff_id,
            asess.ip_address,
            asess.user_agent,
            asess.created_at,
            asess.expires_at,
            asess.is_revoked,
            s.email,
            s.first_name,
            s.last_name
        FROM active_sessions asess
        JOIN staff s ON s.staff_id = asess.staff_id
        WHERE 1=1
    """
    params = []
    if staff_id is not None:
        query += " AND asess.staff_id = %s"
        params.append(staff_id)

    if active_only:
        query += " AND asess.is_revoked = false AND asess.expires_at > now()"

    query += " ORDER BY asess.created_at DESC"

    cur.execute(query, tuple(params))
    rows = cur.fetchall()

    sessions = []
    for row in rows:
        sessions.append({
            "session_id": row[0],
            "staff_id": row[1],
            "ip_address": row[2],
            "user_agent": row[3],
            "created_at": row[4],
            "expires_at": row[5],
            "is_revoked": row[6],
            "staff": {
                "email": row[7],
                "first_name": row[8],
                "last_name": row[9]
            }
        })

    cur.close()
    conn.close()
    return sessions


@router.post("/sessions/{session_id}/close")
def close_user_session(session_id: str, current_staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()

    # Verificar si la sesión existe
    cur.execute("SELECT 1 FROM active_sessions WHERE session_id = %s", (session_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # Revocar la sesión únicamente
    close_session(cur, session_id)

    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Sesión {session_id} cerrada correctamente"}


@router.post("/sessions/{session_id}/revoke")
def revoke_session(session_id: str, current_staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()

    # Verificar si la sesión existe y obtener el staff_id
    cur.execute("SELECT staff_id FROM active_sessions WHERE session_id = %s", (session_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    staff_id = row[0]

    # Revocar la sesión
    close_session(cur, session_id)

    # Desactivar al usuario en staff_auth para que no pueda hacer login
    cur.execute("""
        UPDATE staff_auth
        SET is_active = false
        WHERE staff_id = %s
    """, (staff_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Sesión {session_id} revocada y usuario desactivado correctamente"}


@router.get("/validate-session")
def validate_session(staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT s.staff_id, s.email, s.first_name, s.last_name, r.role_name
            FROM staff s
            JOIN staff_auth sa ON s.staff_id = sa.staff_id
            JOIN roles r ON sa.role_id = r.role_id
            WHERE s.staff_id = %s
        """, (staff_id,))
        row = cur.fetchone()
    finally:
        cur.close()
        conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "valid": True,
        "user": {
            "staff_id": row[0],
            "email": row[1],
            "first_name": row[2],
            "last_name": row[3],
            "role": row[4]
        }
    }


@router.get("/audit")
def get_audit(staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT login_id, staff_id, username, ip_address, user_agent, success, reason, attempted_at
        FROM login_audit
        ORDER BY attempted_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    audits = []
    for row in rows:
        audits.append({
            "login_id": row[0],
            "staff_id": row[1],
            "username": row[2],
            "ip_address": row[3] if row[3] else "Desconocido",
            "user_agent": row[4] if row[4] else "Desconocido",
            "success": row[5],
            "reason": row[6],
            "attempted_at": str(row[7]) if row[7] else None
        })
        
    return audits


@router.get("/intrusion-alerts")
def get_intrusion_alerts(staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. IPs sospechosas (con 5 o más intentos fallidos en login_audit)
    cur.execute("""
        SELECT 
            ip_address,
            COUNT(*) as failed_attempts,
            MAX(attempted_at) as last_attempt,
            array_to_string(array_agg(DISTINCT username), ', ') as usernames
        FROM login_audit
        WHERE success = false
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        ORDER BY failed_attempts DESC, last_attempt DESC
    """)
    suspicious_rows = cur.fetchall()
    
    suspicious_ips = []
    for row in suspicious_rows:
        suspicious_ips.append({
            "ip_address": row[0] if row[0] else "Desconocido",
            "failed_attempts": row[1],
            "last_attempt": str(row[2]) if row[2] else None,
            "usernames": row[3]
        })
        
    # 2. Eventos de intrusión registrados en intrusion_events
    cur.execute("""
        SELECT intrusion_id, username, ip_address, severity, reason, blocked_until, status, created_at
        FROM intrusion_events
        ORDER BY created_at DESC
    """)
    event_rows = cur.fetchall()
    
    events = []
    for row in event_rows:
        events.append({
            "intrusion_id": row[0],
            "username": row[1] if row[1] else "N/A",
            "ip_address": row[2] if row[2] else "Desconocido",
            "severity": row[3],
            "reason": row[4],
            "blocked_until": str(row[5]) if row[5] else None,
            "status": row[6],
            "created_at": str(row[7]) if row[7] else None
        })
        
    cur.close()
    conn.close()
    
    return {
        "suspicious_ips": suspicious_ips,
        "events": events
    }


@router.post("/intrusion-events/{intrusion_id}/resolve")
def resolve_intrusion_event(intrusion_id: int, staff_id: int = Depends(get_current_active_session)):
    conn = get_connection()
    cur = conn.cursor()
    
    # Verificar si el evento existe y obtener sus detalles
    cur.execute("""
        SELECT username, reason 
        FROM intrusion_events 
        WHERE intrusion_id = %s
    """, (intrusion_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Evento de intrusión no encontrado")
        
    username, reason = row
        
    # Actualizar estado a RESOLVED
    cur.execute("""
        UPDATE intrusion_events
        SET status = 'RESOLVED'
        WHERE intrusion_id = %s
    """, (intrusion_id,))
    
    # Si la razón indica intentos fallidos y hay un correo de usuario, lo reactivamos
    if username and reason and "intentos fallidos" in reason.lower():
        cur.execute("""
            UPDATE staff_auth
            SET is_active = true, failed_attempts = 0, locked_until = NULL
            WHERE staff_id = (
                SELECT staff_id 
                FROM staff 
                WHERE email = %s
            )
        """, (username,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {"message": f"Evento de intrusión {intrusion_id} marcado como resuelto. Cuenta reactivada si estaba bloqueada."}



