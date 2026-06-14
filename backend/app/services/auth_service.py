from app.repositories.auth_repository import (
    find_user_by_email,
    register_failed_unknown_user,
    register_wrong_password,
    register_successful_login,
    get_dashboard_stats as get_stats_from_repository
)


def login_user(email, password):
    user = find_user_by_email(email)

    if not user:
        register_failed_unknown_user(email)

        return {
            "success": False,
            "status_code": 401,
            "message": "Usuario no registrado"
        }

    (
        staff_id,
        user_email,
        password_hash,
        is_active,
        failed_attempts,
        locked_until,
        first_name,
        last_name,
        role_name
    ) = user

    if not is_active:
        return {
            "success": False,
            "status_code": 403,
            "message": "Usuario inactivo"
        }

    if password != password_hash:
        register_wrong_password(staff_id, user_email, failed_attempts)

        return {
            "success": False,
            "status_code": 401,
            "message": "Contraseña incorrecta"
        }

    register_successful_login(staff_id, user_email)

    return {
        "success": True,
        "data": {
            "message": "Login correcto",
            "user": {
                "staff_id": staff_id,
                "email": user_email,
                "first_name": first_name,
                "last_name": last_name,
                "role": role_name
            }
        }
    }


def get_dashboard_stats():
    return get_stats_from_repository()