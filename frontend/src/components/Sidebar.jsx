import { Link } from "react-router-dom";
import { User, Key, AlertTriangle, LogOut } from "lucide-react";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <aside className="w-72 bg-slate-950 text-white min-h-screen p-6 flex flex-col justify-between border-r border-slate-800">
      <div>
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/30">
            S
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">
              Sakila M1
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Autenticación y perfiles
            </p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600/10 hover:text-indigo-400 font-semibold transition text-slate-300"
          >
            Dashboard
          </Link>

          <Link
            to="/perfil"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600/10 hover:text-indigo-400 font-semibold transition text-slate-300"
          >
            <User size={18} />
            Perfil Usuario
          </Link>

          {/* Roles y Permisos — solo visible para ADMIN */}
          {user?.role === "ADMIN" && (
            <Link
              to="/roles"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600/10 hover:text-indigo-400 font-semibold transition text-slate-300"
            >
              <Key size={18} />
              Roles y Permisos
            </Link>
          )}

          <Link
            to="/intrusos"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600/10 hover:text-indigo-400 font-semibold transition text-slate-300"
          >
            <AlertTriangle size={18} />
            Monitoreo Intrusos
          </Link>
        </nav>
      </div>

      {/* Info de usuario logueado en la parte inferior */}
      {user && (
        <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
              {user.first_name[0]}{user.last_name[0]}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-slate-200 truncate leading-tight">
                {user.first_name} {user.last_name}
              </h4>
              <span className="text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 tracking-wider inline-block mt-0.5">
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition border border-red-500/10"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      )}
    </aside>
  );
}