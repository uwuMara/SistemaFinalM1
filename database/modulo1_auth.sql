```sql
-- ============================================================
-- MODULO 1: AUTENTICACION Y PERFILES
-- Base: Sakila migrada a PostgreSQL / Supabase
-- ============================================================

-- =========================
-- 1. TABLA DE ROLES
-- =========================

CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 2. TABLA DE PERMISOS
-- =========================

CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    code VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. RELACION ROLES - PERMISOS
-- =========================

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),

    FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE CASCADE,

    FOREIGN KEY (permission_id)
        REFERENCES permissions(permission_id)
        ON DELETE CASCADE
);

-- =========================
-- 4. TABLA DE USUARIOS AUTH
-- =========================

CREATE TABLE IF NOT EXISTS auth_users (
    user_id SERIAL PRIMARY KEY,

    staff_id INTEGER UNIQUE NOT NULL,

    email VARCHAR(120) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role_id INTEGER NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    last_login TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (staff_id)
        REFERENCES staff(staff_id),

    FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);

-- =========================
-- 5. TABLA DE MONITOREO
-- =========================

CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_id SERIAL PRIMARY KEY,

    email VARCHAR(120),

    ip_address VARCHAR(45),

    status VARCHAR(20) NOT NULL,

    reason TEXT,

    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 6. INSERTAR ROLES
-- =========================

INSERT INTO roles (name, description)
VALUES
('ADMIN', 'Acceso total al sistema'),
('MANAGER', 'Encargado de tienda'),
('STAFF', 'Personal de atención')
ON CONFLICT (name) DO NOTHING;

-- =========================
-- 7. INSERTAR PERMISOS
-- =========================

INSERT INTO permissions (code, description)
VALUES
('manage_users', 'Gestionar usuarios'),
('manage_roles', 'Gestionar roles'),
('edit_profile', 'Editar perfil'),
('change_password', 'Cambiar contraseña'),
('view_intrusion_logs', 'Ver monitoreo de intrusos'),
('block_login', 'Bloquear accesos no autorizados')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- 8. PERMISOS ADMIN
-- =========================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- =========================
-- 9. PERMISOS MANAGER
-- =========================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p
ON p.code IN (
    'edit_profile',
    'change_password',
    'view_intrusion_logs'
)
WHERE r.name = 'MANAGER'
ON CONFLICT DO NOTHING;

-- =========================
-- 10. PERMISOS STAFF
-- =========================

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p
ON p.code IN (
    'edit_profile',
    'change_password'
)
WHERE r.name = 'STAFF'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. CREAR NUEVOS EMPLEADOS EN STAFF
-- =====================================================

INSERT INTO staff (
    first_name,
    last_name,
    address_id,
    email,
    store_id,
    active,
    username,
    password,
    last_update
)
VALUES
(
    'Mara',
    'Rivera',
    1,
    'admin@sakila.com',
    1,
    true,
    'mara.admin',
    'admin123',
    CURRENT_TIMESTAMP
),
(
    'Carlos',
    'Manager',
    1,
    'manager@sakila.com',
    1,
    true,
    'carlos.manager',
    'manager123',
    CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. CREAR USUARIOS AUTH
-- =====================================================

INSERT INTO auth_users (
    staff_id,
    email,
    password_hash,
    role_id,
    is_active
)
SELECT
    s.staff_id,
    s.email,
    s.password,
    r.role_id,
    true
FROM staff s
JOIN roles r ON r.name = 'ADMIN'
WHERE s.email = 'admin@sakila.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO auth_users (
    staff_id,
    email,
    password_hash,
    role_id,
    is_active
)
SELECT
    s.staff_id,
    s.email,
    s.password,
    r.role_id,
    true
FROM staff s
JOIN roles r ON r.name = 'MANAGER'
WHERE s.email = 'manager@sakila.com'
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 13. DATOS DE PRUEBA PARA MONITOREO
-- =====================================================

INSERT INTO login_attempts (
    email,
    ip_address,
    status,
    reason
)
VALUES
(
    'admin@sakila.com',
    '192.168.1.20',
    'FAILED',
    'Contraseña incorrecta'
),
(
    'intruso@gmail.com',
    '190.50.10.2',
    'BLOCKED',
    'Usuario no autorizado'
);
```
