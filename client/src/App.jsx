import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Clientes from './pages/admin/Clientes.jsx';
import ClienteDetalle from './pages/admin/ClienteDetalle.jsx';
import Tarjetas from './pages/admin/Tarjetas.jsx';
import Sellos from './pages/admin/Sellos.jsx';
import Recompensas from './pages/admin/Recompensas.jsx';
import Historial from './pages/admin/Historial.jsx';
import Portal from './pages/portal/Portal.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalle />} />
          <Route path="tarjetas" element={<Tarjetas />} />
          <Route path="sellos" element={<Sellos />} />
          <Route path="recompensas" element={<Recompensas />} />
          <Route path="historial" element={<Historial />} />
        </Route>
        <Route path="/c/:code" element={<Portal />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
