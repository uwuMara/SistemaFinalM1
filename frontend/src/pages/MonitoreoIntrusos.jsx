import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

export default function MonitoreoIntrusos() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchSessions = () => {
    setLoading(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/auth/sessions?active_only=${activeOnly}`,
      {
        headers: {
          "X-Session-Id": localStorage.getItem("session_id").replace(/['"]+/g, '')
        }
      }
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

  const fetchAuditLogs = () => {
    setLoading(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/auth/audit`,
      {
        headers: {
          "X-Session-Id": localStorage.getItem("session_id").replace(/['"]+/g, '')
        }
      }
    )
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error ${res.status}: ${errText || "Error al obtener el historial de auditoría"}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Datos de auditoria recibidos:", data);
        setAuditLogs(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Audit Fetch Error:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshData = () => {
    if (activeTab === "sessions") {
      fetchSessions();
    } else {
      fetchAuditLogs();
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeTab, activeOnly]);

  const handleCloseSession = (sessionId) => {
    if (!confirm("¿Estás seguro de que deseas cerrar esta sesión?")) {
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/auth/sessions/${sessionId}/close`, {
      method: "POST",
      headers: {
        "X-Session-Id": localStorage.getItem("session_id").replace(/['"]+/g, '')
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al cerrar la sesión");
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

  const handleRevoke = (sessionId) => {
    if (!confirm("¿Estás seguro de que deseas revocar esta sesión y desactivar al usuario?")) {
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/auth/sessions/${sessionId}/revoke`, {
      method: "POST",
      headers: {
        "X-Session-Id": localStorage.getItem("session_id").replace(/['"]+/g, '')
      },
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
          Monitoreo de Intrusos y Sesiones
        </h1>
        <p className="text-slate-500 mt-2">
          Control de sesiones activas e historial completo de auditoría de accesos.
        </p>

        {/* Mensajes de notificación */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-xl text-white font-semibold transition-all ${message.type === "success" ? "bg-emerald-500" : "bg-red-500"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs de Navegación */}
        <div className="flex gap-6 mt-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`pb-3 font-semibold text-lg transition-all ${activeTab === "sessions"
              ? "border-b-4 border-blue-900 text-blue-900"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Sesiones Activas
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 font-semibold text-lg transition-all ${activeTab === "audit"
              ? "border-b-4 border-blue-900 text-blue-900"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Auditoría de Inicios de Sesión
          </button>
        </div>

        {/* Filtros y Controles */}
        <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-2xl shadow">
          <div>
            {activeTab === "sessions" ? (
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
            ) : (
              <span className="text-slate-600 font-medium">
                Historial completo de intentos de inicio de sesión
              </span>
            )}
          </div>
          <button
            onClick={refreshData}
            className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-semibold transition"
          >
            Actualizar
          </button>
        </div>

        {/* Contenido de la Tab Activa */}
        <div className="mt-8 bg-white rounded-2xl shadow overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Cargando datos...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-500">{error}</div>
          ) : activeTab === "sessions" ? (
            // TAB 1: SESIONES ACTIVAS
            sessions.length === 0 ? (
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
                      <th className="p-4 text-slate-600 font-bold text-center">Acciones</th>
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
                              {session.staff?.first_name} {session.staff?.last_name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {session.staff?.email}
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
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleCloseSession(session.session_id)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                                >
                                  Cerrar Sesión
                                </button>
                                <button
                                  onClick={() => handleRevoke(session.session_id)}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                                >
                                  Revocar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // TAB 2: AUDITORÍA DE INICIOS DE SESIÓN
            auditLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                No se encontraron registros de auditoría.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-slate-600 font-bold">ID</th>
                      <th className="p-4 text-slate-600 font-bold">Usuario / Correo</th>
                      <th className="p-4 text-slate-600 font-bold">Dirección IP</th>
                      <th className="p-4 text-slate-600 font-bold">Dispositivo / User Agent</th>
                      <th className="p-4 text-slate-600 font-bold">Resultado</th>
                      <th className="p-4 text-slate-600 font-bold">Detalle / Razón</th>
                      <th className="p-4 text-slate-600 font-bold">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log.login_id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="p-4 text-slate-500 text-sm font-mono">
                          {log.login_id}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">
                            {log.username || "Usuario desconocido"}
                          </div>
                          {log.staff_id && (
                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md font-mono">
                              Staff ID: {log.staff_id}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 font-mono text-sm">
                          {log.ip_address}
                        </td>
                        <td className="p-4 text-slate-600 text-sm max-w-xs truncate" title={log.user_agent}>
                          {log.user_agent}
                        </td>
                        <td className="p-4">
                          {log.success ? (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                              Exitoso
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                              Fallido
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
                          {log.reason || "N/A"}
                        </td>
                        <td className="p-4 text-slate-500 text-sm">
                          {new Date(log.attempted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}