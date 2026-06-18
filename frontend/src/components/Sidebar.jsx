import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  const cerrarSesion = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const linkClass = (path) =>
    `transition p-4 rounded-xl text-sm font-medium ${
      location.pathname === path
        ? "bg-blue-700 text-white"
        : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
    }`;

  return (
    <>
      {/* Sidebar fijo — no se mueve con el scroll */}
      <aside className="fixed top-0 left-0 w-64 h-screen bg-slate-900 text-white flex flex-col p-5 z-10">

        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-xl font-black tracking-tight">Sakila M1</h1>
          <p className="text-slate-500 text-xs mt-1">Autenticación y perfiles</p>
        </div>

        {/* Navegación */}
        <nav className="flex flex-col gap-2 flex-1">
          <Link to="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
          <Link to="/perfil" className={linkClass("/perfil")}>Perfil Usuario</Link>
          {user?.role === "ADMIN" && (
            <Link to="/roles" className={linkClass("/roles")}>Roles y Permisos</Link>
          )}
          {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
            <Link to="/intrusos" className={linkClass("/intrusos")}>Monitoreo Intrusos</Link>
          )}
        </nav>

        {/* Usuario y cerrar sesión — siempre pegado al fondo */}
        <div className="border-t border-slate-700 pt-4 flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <div className="bg-blue-700 rounded-full w-9 h-9 flex items-center justify-center font-black text-sm shrink-0">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {user.first_name} {user.last_name}
                </p>
                <span className="text-xs text-slate-400">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={cerrarSesion}
            className="w-full bg-slate-800 hover:bg-red-700 transition p-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>

      </aside>

      {/* Espaciador para que el contenido no quede debajo del sidebar fijo */}
      <div className="w-64 shrink-0" />
    </>
  );
}
