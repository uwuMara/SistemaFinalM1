from fastapi import HTTPException
from app.repositories import roles_repository as repo


def get_roles_with_permissions():
    """Arma la lista de roles con sus permisos en formato dict, lista para el frontend."""
    rows = repo.find_all_roles_with_permissions()

    return [
        {
            "role_id": row[0],
            "role_name": row[1],
            "description": row[2],
            "permissions": row[3]
        }
        for row in rows
    ]


def get_all_permissions():
    """Arma la lista de todos los permisos disponibles."""
    rows = repo.find_all_permissions()

    return [
        {
            "permission_id": row[0],
            "permission_code": row[1],
            "description": row[2]
        }
        for row in rows
    ]


def assign_permission(role_id: int, permission_id: int):
    """Valida que rol y permiso existan, luego los asigna."""
    if not repo.role_exists(role_id):
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if not repo.permission_exists(permission_id):
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    repo.add_permission_to_role(role_id, permission_id)
    return {"message": "Permiso agregado correctamente"}


def revoke_permission(role_id: int, permission_id: int):
    """Quita un permiso de un rol. Lanza 404 si no existía la relación."""
    filas_eliminadas = repo.remove_permission_from_role(role_id, permission_id)

    if filas_eliminadas == 0:
        raise HTTPException(status_code=404, detail="El rol no tenía ese permiso")

    return {"message": "Permiso eliminado correctamente"}


def ensure_user_is_admin(staff_id: int):
    """
    Regla de negocio: solo un usuario con rol ADMIN puede gestionar
    roles y permisos. Lanza 403 si no lo es.
    Lista para usarse en cuanto el login del equipo genere session_id.
    """
    role_name = repo.get_role_name_by_staff_id(staff_id)

    if role_name != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo un administrador puede gestionar roles y permisos"
        )
