from fastapi import Header, HTTPException, status
from app.db.connection import get_connection

def get_current_active_session(x_session_id: str = Header(None, alias="X-Session-Id")) -> int:
    if not x_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-Session-Id faltante"
        )
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                asess.staff_id, 
                asess.is_revoked, 
                asess.expires_at > now() AS is_not_expired,
                sa.is_active
            FROM active_sessions asess
            JOIN staff_auth sa ON asess.staff_id = sa.staff_id
            WHERE asess.session_id = %s
        """, (x_session_id,))
        
        row = cur.fetchone()
    finally:
        cur.close()
        conn.close()
        
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no encontrada o inválida"
        )
        
    staff_id, is_revoked, is_not_expired, is_active = row
    
    if is_revoked or not is_not_expired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión revocada o expirada"
        )
        
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
        
    return staff_id
