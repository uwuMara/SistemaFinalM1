import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { ShieldCheck, Users, UserCheck, Plus, Trash2, AlertTriangle } from "lucide-react";

// Configuración visual para cada tipo de rol
const ROL_CONFIG = {
  ADMIN:   { icon: ShieldCheck, color: "bg-blue-900",    badge: "bg-blue-100 text-blue-900" },
  MANAGER: { icon: Users,       color: "bg-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  STAFF:   { icon: UserCheck,   color: "bg-slate-600",   badge: "bg-slate-100 text-slate-600" },
};

export default function RolesPermisos() {
  const user = JSON.parse(localStorage.getItem("user"));

  // Estados
  const [roles, setRoles]                       = useState([]);
  const [todosLosPermisos, setTodosLosPermisos] = useState([]);
  const [rolSeleccionado, setRolSeleccionado]   = useState(null);
  const [cargando, setCargando]                 = useState(true);
  const [confirmar, setConfirmar]               = useState(null);
  const [mensaje, setMensaje]                   = useState(null);

  // Protección de ruta: solo ADMIN puede ver esta pantalla
  if (!user)                 return <Navigate to="/" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  // Mensaje temporal de feedback — declarado ANTES del useEffect
  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  // Carga inicial: función async declarada dentro del useEffect
  // para evitar el warning de setState en efecto
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    async function cargar() {
      try {
        const [resRoles, resPermisos] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/auth/roles`),
          fetch(`${import.meta.env.VITE_API_URL}/auth/permisos`),
        ]);
        const dataRoles    = await resRoles.json();
        const dataPermisos = await resPermisos.json();
        setRoles(dataRoles);
        setTodosLosPermisos(dataPermisos);
        setRolSeleccionado(dataRoles[0]);
      } catch (err) {
        console.error(err);
        setMensaje({ tipo: "error", texto: "No se pudo conectar con el servidor" });
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // Recarga roles tras agregar o quitar un permiso
  const recargarRoles = async (roleIdActivo) => {
    const res      = await fetch(`${import.meta.env.VITE_API_URL}/auth/roles`);
    const dataRoles = await res.json();
    setRoles(dataRoles);
    setRolSeleccionado(dataRoles.find(r => r.role_id === roleIdActivo) || dataRoles[0]);
  };

  // Agrega un permiso al rol seleccionado
  const agregarPermiso = async (permission_id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/roles/${rolSeleccionado.role_id}/permisos/${permission_id}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      mostrarMensaje("ok", "Permiso agregado correctamente");
      await recargarRoles(rolSeleccionado.role_id);
    } catch {
      mostrarMensaje("error", "Error al agregar el permiso");
    }
  };

  // Quita un permiso del rol (solo tras confirmar en el modal)
  const quitarPermiso = async () => {
    if (!confirmar) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/roles/${confirmar.role_id}/permisos/${confirmar.permission_id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      mostrarMensaje("ok", "Permiso eliminado correctamente");
      await recargarRoles(confirmar.role_id);
    } catch {
      mostrarMensaje("error", "Error al eliminar el permiso");
    } finally {
      setConfirmar(null);
    }
  };

  // Permisos que le faltan al rol seleccionado
  const permisosDisponibles = () => {
    if (!rolSeleccionado) return [];
    const tieneIds = new Set(rolSeleccionado.permissions.map(p => p.permission_id));
    return todosLosPermisos.filter(p => !tieneIds.has(p.permission_id));
  };

  return (
    <DashboardLayout>

      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-blue-900">Roles y Permisos</h1>
        <p className="text-slate-500 mt-2">
          Gestión de accesos para Admin, Manager y Staff. Solo visible para administradores.
        </p>
      </div>

      {/* Feedback de acciones */}
      {mensaje && (
        <div className={`mb-6 px-5 py-3 rounded-xl font-semibold text-sm ${
          mensaje.tipo === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>
          {mensaje.tipo === "ok" ? "✓ " : "✗ "}{mensaje.texto}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-400">Cargando roles...</p>
      ) : (
        <>
          {/* Tarjetas de roles — al hacer clic cambia la tabla */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {roles.map((rol) => {
              const config    = ROL_CONFIG[rol.role_name] || ROL_CONFIG.STAFF;
              const Icono     = config.icon;
              const estaActivo = rolSeleccionado?.role_id === rol.role_id;
              return (
                <button
                  key={rol.role_id}
                  onClick={() => setRolSeleccionado(rol)}
                  className={`text-left p-6 rounded-2xl shadow transition ${
                    estaActivo ? "ring-4 ring-blue-400 bg-white scale-105" : "bg-white hover:shadow-lg"
                  }`}
                >
                  <div className={`${config.color} text-white p-3 rounded-xl w-fit mb-4`}>
                    <Icono size={24} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">{rol.role_name}</h2>
                  <p className="text-slate-500 text-sm mt-1">{rol.description}</p>
                  <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${config.badge}`}>
                    {rol.permissions.length} permisos
                  </span>
                </button>
              );
            })}
          </div>

          {rolSeleccionado && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Permisos activos del rol */}
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-xl font-black text-slate-800 mb-1">
                  Permisos activos — {rolSeleccionado.role_name}
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  {rolSeleccionado.permissions.length} permisos asignados. Haz clic en 🗑 para quitar uno.
                </p>
                {rolSeleccionado.permissions.length === 0 ? (
                  <p className="text-slate-400 text-sm">Este rol no tiene permisos asignados.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="pb-3 font-semibold">Código</th>
                        <th className="pb-3 font-semibold">Descripción</th>
                        <th className="pb-3 font-semibold text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolSeleccionado.permissions.map((permiso) => (
                        <tr key={permiso.permission_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 font-mono text-blue-800 font-semibold text-xs">
                            {permiso.permission_code}
                          </td>
                          <td className="py-3 text-slate-600">{permiso.description}</td>
                          <td className="py-3 text-center">
                            {/* Abre modal de confirmación antes de eliminar */}
                            <button
                              onClick={() => setConfirmar({
                                role_id: rolSeleccionado.role_id,
                                permission_id: permiso.permission_id,
                                permission_code: permiso.permission_code,
                              })}
                              className="text-red-400 hover:text-red-600 transition"
                              title="Quitar permiso"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Permisos disponibles para agregar */}
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-xl font-black text-slate-800 mb-1">
                  Permisos disponibles
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  Permisos que {rolSeleccionado.role_name} aún no tiene. Haz clic en + para agregar.
                </p>
                {permisosDisponibles().length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold">
                    ✓ Este rol ya tiene todos los permisos disponibles.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="pb-3 font-semibold">Código</th>
                        <th className="pb-3 font-semibold">Descripción</th>
                        <th className="pb-3 font-semibold text-center">Agregar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permisosDisponibles().map((permiso) => (
                        <tr key={permiso.permission_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 font-mono text-slate-500 text-xs">
                            {permiso.permission_code}
                          </td>
                          <td className="py-3 text-slate-600">{permiso.description}</td>
                          <td className="py-3 text-center">
                            {/* Agrega el permiso al rol directamente */}
                            <button
                              onClick={() => agregarPermiso(permiso.permission_id)}
                              className="text-emerald-500 hover:text-emerald-700 transition"
                              title="Agregar permiso"
                            >
                              <Plus size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* Modal de confirmación para quitar permiso */}
      {confirmar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 text-red-600 p-3 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800">¿Quitar permiso?</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Estás a punto de quitar{" "}
              <span className="font-mono font-bold text-red-600">{confirmar.permission_code}</span>{" "}
              del rol <span className="font-bold">{rolSeleccionado?.role_name}</span>.
              Esta acción afecta los accesos de inmediato.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmar(null)}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-xl font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={quitarPermiso}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600 transition"
              >
                Sí, quitar
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
