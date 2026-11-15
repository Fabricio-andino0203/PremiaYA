import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Stamp,
  Gift,
  History,
  Settings,
  LogOut,
} from 'lucide-react';
import Brand from './Brand.jsx';
import { useAuth } from '../lib/auth.jsx';
import { themeOf } from '../lib/theme.js';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/sellos', label: 'Sellos', icon: Stamp },
  { to: '/admin/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/admin/recompensas', label: 'Premios', icon: Gift },
  { to: '/admin/historial', label: 'Historial', icon: History },
  { to: '/admin/configuracion', label: 'Ajustes', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const business = user?.business;
  const theme = themeOf(business?.theme);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
        : 'text-ink/60 hover:bg-brand-50 hover:text-ink'
    }`;

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-5 border-r border-ink/5 bg-white p-4 md:flex">
        <Brand sub="Fidelización" />
        {business && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-cream px-3 py-2.5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${theme.soft}`}>
              {business.icon}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold">{business.name}</p>
              <p className="text-[11px] font-semibold text-ink/45">Plan {business.plan_name}</p>
            </div>
          </div>
        )}
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-ink/50 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={18} strokeWidth={2.2} />
          Cerrar sesión
        </button>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/5 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          {business && (
            <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-extrabold text-ink/70">
              {business.icon} {business.name}
            </span>
          )}
          <button
            onClick={logout}
            className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-ink/5 bg-white/95 px-1 py-2 backdrop-blur md:hidden">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${
                isActive ? 'text-brand-600' : 'text-ink/45'
              }`
            }
          >
            <Icon size={19} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
