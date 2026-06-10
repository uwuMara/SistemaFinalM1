import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import PerfilUsuario from "../pages/PerfilUsuario";
import RolesPermisos from "../pages/RolesPermisos";
import MonitoreoIntrusos from "../pages/MonitoreoIntrusos";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<PerfilUsuario />} />
        <Route path="/roles" element={<RolesPermisos />} />
        <Route path="/intrusos" element={<MonitoreoIntrusos />} />
      </Routes>
    </BrowserRouter>
  );
}