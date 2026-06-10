import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-72 bg-slate-900 text-white min-h-screen p-6">
      <h1 className="text-2xl font-black">
        Sakila M1
      </h1>

      <p className="text-slate-400 mt-1 text-sm">
        Autenticación y perfiles
      </p>

      <nav className="mt-10 flex flex-col gap-3">

        <Link
          to="/dashboard"
          className="bg-slate-800 hover:bg-blue-800 transition p-4 rounded-xl"
        >
          Dashboard
        </Link>

        <Link
          to="/perfil"
          className="bg-slate-800 hover:bg-blue-800 transition p-4 rounded-xl"
        >
          Perfil Usuario
        </Link>

        <Link
          to="/roles"
          className="bg-slate-800 hover:bg-blue-800 transition p-4 rounded-xl"
        >
          Roles y Permisos
        </Link>

        <Link
          to="/intrusos"
          className="bg-slate-800 hover:bg-blue-800 transition p-4 rounded-xl"
        >
          Monitoreo Intrusos
        </Link>

      </nav>
    </aside>
  );
}