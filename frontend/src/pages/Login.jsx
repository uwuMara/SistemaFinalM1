import { useState } from "react";
import { Lock, Mail, Film, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Error al iniciar sesión");
        return;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("session_id");

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.session_id) {
        localStorage.setItem("session_id", data.session_id);
      }

      window.location.href = "/dashboard";
    } catch {
      setError("No se pudo conectar con el backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#1E3A8A] text-white p-4 rounded-2xl mb-4">
            <Film size={36} />
          </div>

          <h1 className="text-3xl font-black text-blue-900">
            Sistema Sakila
          </h1>

          <p className="text-slate-500 mt-2 text-center">
            Inicio de Sesión
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
                autoFocus
                type="email"
                placeholder="usuario@correo.com"
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
                type={showPassword ? "text" : "password"}
                placeholder="Ingrese su contraseña"
                className="w-full outline-none text-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-[#EF4444] text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-xl font-bold hover:bg-[#3B82F6] transition disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}