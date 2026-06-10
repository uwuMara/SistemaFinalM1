import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {
  return (
    <DashboardLayout>

      <div>
        <h1 className="text-4xl font-black text-blue-900">
          Dashboard Módulo 1
        </h1>

        <p className="text-slate-500 mt-2">
          Resumen general del sistema.
        </p>
      </div>

    </DashboardLayout>
  );
}