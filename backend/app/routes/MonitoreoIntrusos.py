import uuid
from fastapi import APIRouter, HTTPException
from app.db.connection import get_connection

router = APIRouter(prefix="/auth", tags=["Monitoreo de Intrusos"])


def create_session(cur, staff_id: int, ip_address: str, user_agent: str) -> str:
    session_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO active_sessions (session_id, staff_id, ip_address, user_agent, expires_at)
        VALUES (%s, %s, %s, %s, now() + interval '24 hours')
    """, (session_id, staff_id, ip_address, user_agent))
    return session_id


@router.get("/sessions")
def get_active_sessions(staff_id: int = None, active_only: bool = True):
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


@router.post("/sessions/{session_id}/revoke")
def revoke_session(session_id: str):
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
    cur.execute("""
        UPDATE active_sessions
        SET is_revoked = true
        WHERE session_id = %s
    """, (session_id,))

    # Desactivar al usuario en staff_auth para que no pueda hacer login
    cur.execute("""
        UPDATE staff_auth
        SET is_active = false
        WHERE staff_id = %s
    """, (staff_id,))

    conn.commit()
    cur.close()
    conn.close()

    return {"message": f"Sesión {session_id} revocada correctamente"}