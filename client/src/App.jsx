import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireRole } from './lib/auth.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import SuperLayout from './components/SuperLayout.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Clientes from './pages/admin/Clientes.jsx';
import ClienteDetalle from './pages/admin/ClienteDetalle.jsx';
import Tarjetas from './pages/admin/Tarjetas.jsx';
import Sellos from './pages/admin/Sellos.jsx';
import Recompensas from './pages/admin/Recompensas.jsx';
import Historial from './pages/admin/Historial.jsx';
import Configuracion from './pages/admin/Configuracion.jsx';
import SuperDashboard from './pages/super/SuperDashboard.jsx';
import Negocios from './pages/super/Negocios.jsx';
import Planes from './pages/super/Planes.jsx';
import Pagos from './pages/super/Pagos.jsx';
import Portal from './pages/portal/Portal.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/r/:slug" element={<Registro />} />
          <Route path="/c/:code" element={<Portal />} />

          <Route
            path="/admin"
            element={
              <RequireRole role="business">
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteDetalle />} />
            <Route path="tarjetas" element={<Tarjetas />} />
            <Route path="sellos" element={<Sellos />} />
            <Route path="recompensas" element={<Recompensas />} />
            <Route path="historial" element={<Historial />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          <Route
            path="/super"
            element={
              <RequireRole role="super">
                <SuperLayout />
              </RequireRole>
            }
          >
            <Route index element={<SuperDashboard />} />
            <Route path="negocios" element={<Negocios />} />
            <Route path="planes" element={<Planes />} />
            <Route path="pagos" element={<Pagos />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
