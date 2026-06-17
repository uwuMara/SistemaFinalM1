import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {

  const user = JSON.parse(localStorage.getItem("user"));

  const [stats, setStats] = useState({
    usuarios_activos: 0,
    intentos_bloqueados: 0,
    roles_registrados: 0,
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/auth/dashboard/stats`,
      {
        headers: {
          "X-Session-Id": localStorage.getItem("session_id").replace(/['"]+/g, '')
        }
      }
    )
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <DashboardLayout>

      <div>
        <h1 className="text-4xl font-black text-blue-900">
          Dashboard Módulo 1
        </h1>

        <p className="text-slate-500 mt-2">
          Sistema de autenticación y perfiles Sakila.
        </p>

        <div className="mt-4 bg-white p-5 rounded-2xl shadow">
          <h2 className="text-2xl font-bold text-slate-800">
            Bienvenido {user?.first_name} {user?.last_name}
          </h2>

          <p className="text-slate-500 mt-1">
            Rol: {user?.role}
          </p>

          <p className="text-slate-500">
            Correo: {user?.email}
          </p>

          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
            className="
              mt-4
              bg-red-500
              hover:bg-red-600
              text-white
              px-4
              py-2
              rounded-xl
              font-semibold
              transition
            "
          >
            Cerrar Sesión
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Usuarios Activos
          </h2>

          <p className="text-4xl font-black text-blue-900 mt-3">
            {stats.usuarios_activos}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Intentos Bloqueados
          </h2>

          <p className="text-4xl font-black text-red-500 mt-3">
            {stats.intentos_bloqueados}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Roles Registrados
          </h2>

          <p className="text-4xl font-black text-emerald-500 mt-3">
            {stats.roles_registrados}
          </p>
        </div>

      </div>

    </DashboardLayout>
  );
}