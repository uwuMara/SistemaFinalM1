import { useState } from "react";
import { Lock, Mail, Film } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-900 text-white p-4 rounded-2xl mb-4">
            <Film size={36} />
          </div>

          <h1 className="text-3xl font-black text-blue-900">
            Sistema Sakila
          </h1>

          <p className="text-slate-500 mt-2 text-center">
            Módulo 1 - Autenticación y Perfiles
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Correo electrónico
            </label>

            <div className="flex items-center border border-slate-300 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
              <Mail className="text-slate-400 mr-3" size={20} />
              <input
                type="email"
                placeholder="usuario@sakila.com"
                className="w-full outline-none text-slate-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Contraseña
            </label>

            <div className="flex items-center border border-slate-300 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
              <Lock className="text-slate-400 mr-3" size={20} />
              <input
                type="password"
                placeholder="Ingrese su contraseña"
                className="w-full outline-none text-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Iniciar sesión
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Acceso según rol: Admin, Manager o Staff
        </div>
      </div>
    </div>
  );
}