import { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Lock, Shield, Laptop, 
  Calendar, Key, Save, AlertCircle, CheckCircle2, LogOut, ChevronRight
} from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

export default function PerfilUsuario() {
  const [activeTab, setActiveTab] = useState("datos");
  
  // Perfil del usuario y listado de ciudades
  const [profile, setProfile] = useState({
    staff_id: null,
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    store_id: 1,
    active: true,
    role: "",
    address: "",
    address2: "",
    district: "",
    postal_code: "",
    phone: "",
    city_id: 1,
    city: "",
    country: ""
  });
  
  const [cities, setCities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [audits, setAudits] = useState([]);
  
  // Cambios de contraseña
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });
  
  // Estado de carga y mensajes
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Flujo de seguridad 2FA
  const [step, setStep] = useState("form");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [closeOtherSessions, setCloseOtherSessions] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // Cargar datos de localStorage (de lo que guardó el compañero en Login)
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const staffId = storedUser?.staff_id;

  // Obtener o generar session_id
  let sessionId = localStorage.getItem("session_id");
  if (sessionId) {
    sessionId = sessionId.replace(/['"]+/g, '');
  } else if (staffId) {
    sessionId = `session-auto-created-${staffId}`;
    localStorage.setItem("session_id", sessionId);
  }

  useEffect(() => {
    if (!staffId) {
      window.location.href = "/";
      return;
    }
    loadData();
  }, [staffId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Obtener perfil (GET)
      const profRes = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          "X-Session-Id": sessionId
        }
      });
      if (!profRes.ok) throw new Error("No se pudo cargar el perfil");
      const profData = await profRes.json();
      setProfile(profData);

      // 2. Obtener ciudades para el combobox (GET)
      const citiesRes = await fetch(`${API_URL}/auth/cities`);
      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        setCities(citiesData);
      }

      // 3. Obtener auditoría (GET)
      const auditRes = await fetch(`${API_URL}/auth/profile/audit`, {
        headers: {
          "X-Session-Id": sessionId
        }
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAudits(auditData);
      }

      // 4. Obtener sesiones activas (GET)
      const sessRes = await fetch(`${API_URL}/auth/profile/sessions`, {
        headers: {
          "X-Session-Id": sessionId
        }
      });
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData);
      }

    } catch (err) {
      showMsg("error", err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Llamada POST para actualizar
      const response = await fetch(`${API_URL}/auth/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          username: profile.username,
          phone: profile.phone,
          address: profile.address,
          address2: profile.address2,
          district: profile.district,
          postal_code: profile.postal_code,
          city_id: parseInt(profile.city_id)
        })
      });

      const resJson = await response.json();
      if (!response.ok) throw new Error(resJson.detail || "Error al actualizar perfil");

      showMsg("success", "Datos actualizados exitosamente.");
      
      // Actualizar localStorage con los datos actualizados del usuario
      localStorage.setItem("user", JSON.stringify({
        ...storedUser,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email
      }));
      
      // Recargar datos para refrescar la información mostrada
      loadData();
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showMsg("error", "Las contraseñas no coinciden");
      return;
    }
    if (passwordForm.new_password.length < 5) {
      showMsg("error", "La contraseña nueva debe tener al menos 5 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      // Llamada POST para solicitar el código 2FA
      const response = await fetch(`${API_URL}/auth/change-password/request-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
      });

      const resJson = await response.json();
      if (!response.ok) throw new Error(resJson.detail || "Error al solicitar código");

      setMaskedEmail(resJson.email);
      setStep("verification");
      showMsg("success", "Se ha enviado un código de seguridad a su correo.");
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndChangePassword = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      showMsg("error", "El código debe ser de 6 dígitos");
      return;
    }

    setSubmitting(true);
    try {
      // Llamada POST para confirmar y cambiar contraseña con el código 2FA
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
          code: code,
          close_other_sessions: closeOtherSessions
        })
      });

      const resJson = await response.json();
      if (!response.ok) throw new Error(resJson.detail || "Error al cambiar la contraseña");

      showMsg("success", resJson.message || "Contraseña actualizada correctamente.");
      
      // Limpiar estados
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      setCode("");
      setCloseOtherSessions(false);
      setStep("form");
      loadData();
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSession = async (targetSessionId) => {
    if (!confirm("¿Estás seguro de que deseas cerrar esta sesión? El dispositivo perderá el acceso inmediatamente.")) return;
    try {
      // Llamada POST para revocar
      const response = await fetch(`${API_URL}/auth/profile/sessions/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId
        },
        body: JSON.stringify({
          session_id: targetSessionId
        })
      });

      if (!response.ok) {
        const resJson = await response.json();
        throw new Error(resJson.detail || "Error al revocar la sesión");
      }

      showMsg("success", "Sesión cerrada con éxito.");
      loadData();
    } catch (err) {
      showMsg("error", err.message);
    }
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: "Vacía", color: "bg-slate-300" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score === 1) return { score, text: "Débil", color: "bg-red-500 w-1/4" };
    if (score === 2) return { score, text: "Media", color: "bg-yellow-500 w-2/4" };
    if (score === 3) return { score, text: "Buena", color: "bg-blue-500 w-3/4" };
    return { score, text: "Fuerte", color: "bg-emerald-500 w-full" };
  };

  const passStrength = calculatePasswordStrength(passwordForm.new_password);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Cabecera del Perfil */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-8 border border-white/10">
          <div className="flex items-center gap-6 mb-6 md:mb-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-1 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 to-indigo-300">
                  {profile.first_name ? profile.first_name[0] : ""}{profile.last_name ? profile.last_name[0] : ""}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {profile.first_name} {profile.last_name}
                </h1>
                <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-cyan-500/30">
                  {profile.role || storedUser?.role}
                </span>
              </div>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Mail size={16} /> {profile.email}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-400">
                <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  ID Empleado: #{profile.staff_id}
                </span>
                <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  Tienda Asignada: #{profile.store_id}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition duration-200 border border-red-500/20"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Notificación Global */}
        {message.text && (
          <div className={`p-4 mb-6 rounded-2xl flex items-start gap-3 border shadow-sm transition-all duration-300 ${
            message.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {message.type === "success" ? <CheckCircle2 size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
            <span className="font-semibold text-sm">{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Navegación Pestañas Lateral */}
            <div className="lg:col-span-1 flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("datos")}
                className={`flex items-center justify-between p-4 rounded-2xl font-bold transition duration-200 border ${
                  activeTab === "datos"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/10"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User size={18} />
                  <span>Datos Personales</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => setActiveTab("seguridad")}
                className={`flex items-center justify-between p-4 rounded-2xl font-bold transition duration-200 border ${
                  activeTab === "seguridad"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/10"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock size={18} />
                  <span>Seguridad</span>
                </div>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => setActiveTab("sesiones")}
                className={`flex items-center justify-between p-4 rounded-2xl font-bold transition duration-200 border ${
                  activeTab === "sesiones"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/10"
                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} />
                  <span>Sesiones y Auditoría</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Contenido Dinámico */}
            <div className="lg:col-span-3">
              
              {/* PESTAÑA: DATOS PERSONALES */}
              {activeTab === "datos" && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <User size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-950">Información del Staff</h2>
                      <p className="text-slate-500 text-sm">Gestiona tus datos de contacto y dirección física registrados en Sakila.</p>
                    </div>
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                        <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                          <User className="text-slate-400 mr-3" size={18} />
                          <input
                            type="text"
                            name="first_name"
                            value={profile.first_name}
                            onChange={handleProfileChange}
                            required
                            className="w-full bg-transparent outline-none text-slate-800 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellido</label>
                        <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                          <User className="text-slate-400 mr-3" size={18} />
                          <input
                            type="text"
                            name="last_name"
                            value={profile.last_name}
                            onChange={handleProfileChange}
                            required
                            className="w-full bg-transparent outline-none text-slate-800 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                        <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                          <Mail className="text-slate-400 mr-3" size={18} />
                          <input
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleProfileChange}
                            required
                            className="w-full bg-transparent outline-none text-slate-800 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de Usuario</label>
                        <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                          <User className="text-slate-400 mr-3" size={18} />
                          <input
                            type="text"
                            name="username"
                            value={profile.username}
                            onChange={handleProfileChange}
                            required
                            className="w-full bg-transparent outline-none text-slate-800 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 mt-8">
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <MapPin size={18} className="text-indigo-600" /> Dirección de Tienda / Residencia
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección Línea 1</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <MapPin className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              name="address"
                              value={profile.address}
                              onChange={handleProfileChange}
                              required
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección Línea 2 (Opcional)</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <MapPin className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              name="address2"
                              value={profile.address2}
                              onChange={handleProfileChange}
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distrito / Estado</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <MapPin className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              name="district"
                              value={profile.district}
                              onChange={handleProfileChange}
                              required
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código Postal</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <MapPin className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              name="postal_code"
                              value={profile.postal_code}
                              onChange={handleProfileChange}
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <Phone className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              name="phone"
                              value={profile.phone}
                              onChange={handleProfileChange}
                              required
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ciudad (Ubicación)</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <MapPin className="text-slate-400 mr-3" size={18} />
                            <select
                              name="city_id"
                              value={profile.city_id}
                              onChange={handleProfileChange}
                              className="w-full bg-transparent outline-none text-slate-800 font-medium"
                            >
                              {cities.map((city) => (
                                <option key={city.city_id} value={city.city_id}>
                                  {city.city} ({city.country})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                      >
                        <Save size={18} />
                        {submitting ? "Guardando..." : "Guardar Cambios"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* PESTAÑA: SEGURIDAD (CONTRASEÑA) */}
              {activeTab === "seguridad" && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
                  {step === "form" ? (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                          <Lock size={22} />
                        </div>
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-950">Seguridad de la Cuenta</h2>
                          <p className="text-slate-500 text-sm">Cambia tu contraseña de acceso para mantener tu cuenta protegida.</p>
                        </div>
                      </div>

                      <form onSubmit={handleRequestCode} className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña Actual</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                            <Key className="text-slate-400 mr-3" size={18} />
                            <input
                              type="password"
                              value={passwordForm.old_password}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, old_password: e.target.value }))}
                              required
                              placeholder="••••••••"
                              className="w-full bg-transparent outline-none text-slate-850 font-medium"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                              <Lock className="text-slate-400 mr-3" size={18} />
                              <input
                                type="password"
                                value={passwordForm.new_password}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                                required
                                placeholder="••••••••"
                                className="w-full bg-transparent outline-none text-slate-850 font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirmar Nueva Contraseña</label>
                            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                              <Lock className="text-slate-400 mr-3" size={18} />
                              <input
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                                required
                                placeholder="••••••••"
                                className="w-full bg-transparent outline-none text-slate-850 font-medium"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Fortaleza de la Contraseña */}
                        {passwordForm.new_password && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                              <span>Fortaleza de la contraseña:</span>
                              <span className="font-extrabold text-indigo-600">{passStrength.text}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${passStrength.color}`}></div>
                            </div>
                            <ul className="text-xs text-slate-500 mt-3 space-y-1">
                              <li className={passwordForm.new_password.length >= 6 ? "text-emerald-600 font-semibold" : ""}>✓ Mínimo 6 caracteres</li>
                              <li className={/[A-Z]/.test(passwordForm.new_password) ? "text-emerald-600 font-semibold" : ""}>✓ Al menos una mayúscula</li>
                              <li className={/[0-9]/.test(passwordForm.new_password) ? "text-emerald-600 font-semibold" : ""}>✓ Al menos un número</li>
                            </ul>
                          </div>
                        )}

                        <div className="flex justify-end pt-6 border-t border-slate-100">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                          >
                            <ChevronRight size={18} />
                            {submitting ? "Procesando..." : "Siguiente: Enviar código"}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                          <Shield size={22} />
                        </div>
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-950">Verificación de 2 Pasos</h2>
                          <p className="text-slate-500 text-sm">Ingresa el código que acabamos de enviar a tu correo.</p>
                        </div>
                      </div>

                      <form onSubmit={handleVerifyAndChangePassword} className="space-y-6">
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm text-blue-800 flex items-start gap-2.5">
                          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
                          <div>
                            Se ha enviado un código de seguridad de 6 dígitos a la dirección <strong>{maskedEmail}</strong>. El código expirará en 10 minutos.
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código de Verificación</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus-within:border-indigo-500">
                            <Key className="text-slate-400 mr-3" size={18} />
                            <input
                              type="text"
                              maxLength={6}
                              value={code}
                              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                              required
                              placeholder="123456"
                              className="w-full bg-transparent outline-none text-slate-850 font-bold tracking-[6px] text-lg placeholder:tracking-normal placeholder:font-normal"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            id="closeOtherSessions"
                            checked={closeOtherSessions}
                            onChange={(e) => setCloseOtherSessions(e.target.checked)}
                            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="closeOtherSessions" className="text-sm font-semibold text-slate-700 cursor-pointer">
                            Cerrar todas las demás sesiones activas en otros dispositivos
                          </label>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => { setStep("form"); setCode(""); }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-2xl transition duration-200"
                          >
                            Volver
                          </button>

                          <button
                            type="submit"
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-2xl flex items-center gap-2 transition duration-200 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                          >
                            <CheckCircle2 size={18} />
                            {submitting ? "Verificando..." : "Confirmar y cambiar contraseña"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* PESTAÑA: SESIONES Y AUDITORÍA */}
              {activeTab === "sesiones" && (
                <div className="space-y-8">
                  {/* Sesiones Activas */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Laptop size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-950">Dispositivos y Sesiones Activas</h2>
                        <p className="text-slate-500 text-sm">Estas son las sesiones que han iniciado sesión en tu cuenta recientemente.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {sessions.map((sess) => (
                        <div key={sess.session_id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:bg-slate-50/50 transition">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="p-3 rounded-xl bg-slate-100 text-slate-500 flex-shrink-0">
                              <Laptop size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 block truncate max-w-sm sm:max-w-md" title={sess.user_agent}>
                                  {sess.user_agent}
                                </span>
                                {sess.is_current && (
                                  <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                                    Sesión Actual
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span>IP: {sess.ip_address}</span>
                                <span>•</span>
                                <span>Iniciado: {new Date(sess.created_at).toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleRevokeSession(sess.session_id)}
                            className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold transition flex-shrink-0"
                          >
                            Cerrar Sesión
                          </button>
                        </div>
                      ))}
                      
                      {sessions.length === 0 && (
                        <p className="text-center text-slate-400 py-6">No hay otras sesiones activas.</p>
                      )}
                    </div>
                  </div>

                  {/* Auditoría de Accesos */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-950">Historial de Accesos Recientes</h2>
                        <p className="text-slate-500 text-sm">Registro de auditoría de los últimos 10 intentos de inicio de sesión de tu cuenta.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="pb-4 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[22%]">Fecha / Hora</th>
                            <th className="pb-4 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Dirección IP</th>
                            <th className="pb-4 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">Detalles / Cliente</th>
                            <th className="pb-4 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[12%]">Estado</th>
                            <th className="pb-4 pt-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-[16%]">Resultado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {audits.map((aud) => (
                            <tr key={aud.login_id} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 text-sm font-medium text-slate-700">
                                {new Date(aud.attempted_at).toLocaleString()}
                              </td>
                              <td className="py-4 text-sm font-mono text-slate-600">
                                {aud.ip_address}
                              </td>
                              <td className="py-4 text-sm text-slate-500 truncate pr-4" title={aud.user_agent}>
                                {aud.user_agent}
                              </td>
                              <td className="py-4 text-sm">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                  aud.success 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                                }`}>
                                  {aud.success ? "Éxito" : "Fallido"}
                                </span>
                              </td>
                              <td className="py-4 text-sm font-medium text-slate-600 truncate" title={aud.reason}>
                                {aud.reason}
                              </td>
                            </tr>
                          ))}

                          {audits.length === 0 && (
                            <tr>
                              <td colSpan="5" className="text-center text-slate-400 py-8">No hay registros de auditoría disponibles.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}