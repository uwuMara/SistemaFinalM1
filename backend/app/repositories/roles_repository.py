from app.db.connection import get_connection


def find_all_roles_with_permissions():
    """Trae todos los roles junto con la lista de permisos de cada uno."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            r.role_id,
            r.role_name,
            r.description,
            COALESCE(
                json_agg(
                    json_build_object(
                        'permission_id', p.permission_id,
                        'permission_code', p.permission_code,
                        'description', p.description
                    )
                ) FILTER (WHERE p.permission_id IS NOT NULL),
                '[]'
            ) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
        LEFT JOIN permissions p ON p.permission_id = rp.permission_id
        GROUP BY r.role_id, r.role_name, r.description
        ORDER BY r.role_id
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def find_all_permissions():
    """Trae todos los permisos disponibles en el sistema."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT permission_id, permission_code, description FROM permissions ORDER BY permission_id")
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return rows


def role_exists(role_id):
    """Verifica si un rol existe. Retorna True/False."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT role_id FROM roles WHERE role_id = %s", (role_id,))
    existe = cur.fetchone() is not None

    cur.close()
    conn.close()
    return existe


def permission_exists(permission_id):
    """Verifica si un permiso existe. Retorna True/False."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT permission_id FROM permissions WHERE permission_id = %s", (permission_id,))
    existe = cur.fetchone() is not None

    cur.close()
    conn.close()
    return existe


def add_permission_to_role(role_id, permission_id):
    """Asigna un permiso a un rol. ON CONFLICT evita duplicados."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
    """, (role_id, permission_id))

    conn.commit()
    cur.close()
    conn.close()


def remove_permission_from_role(role_id, permission_id):
    """Quita un permiso de un rol. Retorna cuántas filas se eliminaron (0 o 1)."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM role_permissions
        WHERE role_id = %s AND permission_id = %s
    """, (role_id, permission_id))

    filas_eliminadas = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return filas_eliminadas


def get_role_name_by_staff_id(staff_id):
    """Dado un staff_id, retorna el nombre de su rol (ADMIN/MANAGER/STAFF) o None."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT r.role_name
        FROM staff_auth sa
        JOIN roles r ON r.role_id = sa.role_id
        WHERE sa.staff_id = %s
    """, (staff_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else None
