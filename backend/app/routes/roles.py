from fastapi import APIRouter, Path
from pydantic import BaseModel
from app.services import roles_service

router = APIRouter(prefix="/roles", tags=["Roles y Permisos"])

class PermisoOut(BaseModel):
    permission_id: int
    permission_code: str
    description: str


class RolOut(BaseModel):
    role_id: int
    role_name: str
    description: str
    permissions: list[PermisoOut]


class MensajeOut(BaseModel):
    message: str


@router.get("/", response_model=list[RolOut])
def get_roles_permisos():
    """Retorna todos los roles con sus permisos asignados."""
    return roles_service.get_roles_with_permissions()


@router.get("/permisos", response_model=list[PermisoOut])
def get_todos_los_permisos():
    """Retorna todos los permisos disponibles en el sistema."""
    return roles_service.get_all_permissions()


@router.post("/{role_id}/permisos/{permission_id}", response_model=MensajeOut)
def agregar_permiso(
    role_id: int = Path(..., gt=0, description="ID del rol, debe ser positivo"),
    permission_id: int = Path(..., gt=0, description="ID del permiso, debe ser positivo"),
):
    """Agrega un permiso a un rol."""
    return roles_service.assign_permission(role_id, permission_id)


@router.delete("/{role_id}/permisos/{permission_id}", response_model=MensajeOut)
def quitar_permiso(
    role_id: int = Path(..., gt=0, description="ID del rol, debe ser positivo"),
    permission_id: int = Path(..., gt=0, description="ID del permiso, debe ser positivo"),
):
    """Elimina un permiso de un rol."""
    return roles_service.revoke_permission(role_id, permission_id)