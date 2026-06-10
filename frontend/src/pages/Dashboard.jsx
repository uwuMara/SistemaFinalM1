import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>

      <div>
        <h1 className="text-4xl font-black text-blue-900">
          Dashboard Módulo 1
        </h1>

        <p className="text-slate-500 mt-2">
          Sistema de autenticación y perfiles Sakila.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Usuarios Activos
          </h2>

          <p className="text-4xl font-black text-blue-900 mt-3">
            128
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Intentos Bloqueados
          </h2>

          <p className="text-4xl font-black text-red-500 mt-3">
            14
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-slate-500 text-sm">
            Roles Registrados
          </h2>

          <p className="text-4xl font-black text-emerald-500 mt-3">
            3
          </p>
        </div>

      </div>

    </DashboardLayout>
  );
}