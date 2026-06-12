import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

export default function MonitoreoIntrusos() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchSessions = () => {
    setLoading(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/auth/sessions?active_only=${activeOnly}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al obtener las sesiones");
        }
        return res.json();
      })
      .then((data) => {
        setSessions(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSessions();
  }, [activeOnly]);

  const handleRevoke = (sessionId) => {
    if (!confirm("¿Estás seguro de que deseas revocar esta sesión?")) {
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/auth/sessions/${sessionId}/revoke`, {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al revocar la sesión");
        }
        return res.json();
      })
      .then((data) => {
        setMessage({ type: "success", text: data.message });
        fetchSessions();
        setTimeout(() => setMessage(null), 4000);
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setTimeout(() => setMessage(null), 4000);
      });
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-4xl font-black text-blue-900">
          Monitoreo de Sesiones
        </h1>
        <p className="text-slate-500 mt-2">
          Control y visualización de las sesiones activas en la plataforma.
        </p>

        {/* Mensajes de notificación */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-xl text-white font-semibold transition-all ${
              message.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filtros */}
        <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-2xl shadow">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeOnly"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="activeOnly"
              className="text-slate-700 font-medium select-none cursor-pointer"
            >
              Mostrar solo sesiones activas
            </label>
          </div>
          <button
            onClick={fetchSessions}
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-semibold transition"
          >
            Actualizar
          </button>
        </div>

        {/* Tabla de Sesiones */}
        <div className="mt-8 bg-white rounded-2xl shadow overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Cargando sesiones...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-500">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No se encontraron sesiones.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-slate-600 font-bold">Usuario</th>
                    <th className="p-4 text-slate-600 font-bold">Dirección IP</th>
                    <th className="p-4 text-slate-600 font-bold">Navegador / Dispositivo</th>
                    <th className="p-4 text-slate-600 font-bold">Creado</th>
                    <th className="p-4 text-slate-600 font-bold">Expira</th>
                    <th className="p-4 text-slate-600 font-bold">Estado</th>
                    <th className="p-4 text-slate-600 font-bold text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isSessionExpired = new Date(session.expires_at) < new Date();
                    const isActive = !session.is_revoked && !isSessionExpired;

                    return (
                      <tr
                        key={session.session_id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">
                            {session.staff.first_name} {session.staff.last_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {session.staff.email}
                          </div>
                        </td>
                        <td className="p-4 text-slate-700 font-mono text-sm">
                          {session.ip_address || "N/A"}
                        </td>
                        <td className="p-4 text-slate-600 text-sm max-w-xs truncate" title={session.user_agent}>
                          {session.user_agent || "N/A"}
                        </td>
                        <td className="p-4 text-slate-500 text-sm">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-slate-500 text-sm">
                          {new Date(session.expires_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          {isActive ? (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                              Activa
                            </span>
                          ) : session.is_revoked ? (
                            <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                              Revocada
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                              Expirada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isActive && (
                            <button
                              onClick={() => handleRevoke(session.session_id)}
                              className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg font-semibold transition"
                            >
                              Revocar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}