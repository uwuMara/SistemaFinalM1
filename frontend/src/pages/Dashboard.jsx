import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import {
  Users,
  ShieldAlert,
  UserCog
} from "lucide-react";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [stats, setStats] = useState({
    usuarios_activos: 0,
    intentos_bloqueados: 0,
    roles_registrados: 0,
  });

  useEffect(() => {
    if (!user) {
      window.location.href = "/";
      return;
    }

    const verificarSesion = () => {
      const sessionId =
        localStorage.getItem("session_id")?.replace(/['"]+/g, "") || "";

      fetch(`${import.meta.env.VITE_API_URL}/auth/dashboard/stats`, {
        headers: {
          "X-Session-Id": sessionId,
        },
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem("user");
            localStorage.removeItem("session_id");
            window.location.href = "/";
            return null;
          }

          return res.json();
        })
        .then((data) => {
          if (data) setStats(data);
        })
        .catch((err) => console.error(err));
    };

    verificarSesion();

    const interval = setInterval(verificarSesion, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return null;
  }

  return (
  <DashboardLayout>
    <div>
      <h1 className="text-4xl font-black text-[#1E3A8A]">
        Dashboard
      </h1>

      <p className="text-slate-500 mt-2">
        Sistema de autenticación y perfiles Sakila.
      </p>

      <div className="mt-4 bg-white p-5 rounded-2xl shadow">
        <h2 className="text-2xl font-bold text-slate-800">
          Bienvenido {user?.first_name} {user?.last_name}
        </h2>

        <div className="mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#1E3A8A]">
            {user?.role}
          </span>
        </div>

        <p className="text-slate-500 mt-2">
          Correo: {user?.email}
        </p>

        <p className="text-[#10B981] font-semibold mt-2">
          ● Sesión activa
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-500 text-sm">
            Usuarios Activos
          </h2>

          <Users size={24} className="text-[#1E3A8A]" />
        </div>

        <p className="text-4xl font-black text-[#1E3A8A] mt-3">
          {stats.usuarios_activos}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-500 text-sm">
            Intentos Bloqueados
          </h2>

          <ShieldAlert size={24} className="text-[#EF4444]" />
        </div>

        <p className="text-4xl font-black text-[#EF4444] mt-3">
          {stats.intentos_bloqueados}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-500 text-sm">
            Roles Registrados
          </h2>

          <UserCog size={24} className="text-[#10B981]" />
        </div>

        <p className="text-4xl font-black text-[#10B981] mt-3">
          {stats.roles_registrados}
        </p>
      </div>
    </div>
  </DashboardLayout>
);
}