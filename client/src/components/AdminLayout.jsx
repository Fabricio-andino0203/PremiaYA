import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Stamp,
  Gift,
  History,
} from 'lucide-react';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/sellos', label: 'Sellos', icon: Stamp },
  { to: '/admin/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { to: '/admin/recompensas', label: 'Premios', icon: Gift },
  { to: '/admin/historial', label: 'Historial', icon: History },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-xl shadow-md shadow-rose-200">
        🥤
      </span>
      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight">Fresko</p>
        <p className="text-xs font-medium text-ink/50">Rewards</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-ink text-white shadow-md'
        : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
    }`;

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-ink/5 bg-white p-4 md:flex">
        <Brand />
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-[11px] text-ink/35">
          Demo · Sistema de recompensas
        </p>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/5 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-ink/5 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold ${
                isActive ? 'text-rose-500' : 'text-ink/45'
              }`
            }
          >
            <Icon size={20} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
