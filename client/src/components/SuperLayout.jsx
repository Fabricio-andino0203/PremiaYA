import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Store, Layers, Receipt, LogOut } from 'lucide-react';
import Brand from './Brand.jsx';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { to: '/super', end: true, label: 'Panel', icon: LayoutDashboard },
  { to: '/super/negocios', label: 'Negocios', icon: Store },
  { to: '/super/planes', label: 'Planes', icon: Layers },
  { to: '/super/pagos', label: 'Pagos', icon: Receipt },
];

export default function SuperLayout() {
  const { logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-gradient-to-b from-brand-800 to-brand-700 p-4 md:flex">
        <div className="rounded-2xl bg-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sun to-accent text-xl">
              🎁
            </span>
            <div className="leading-tight text-white">
              <p className="text-base font-extrabold">
                Premia<span className="text-sun">Ya</span>
              </p>
              <p className="text-[11px] font-semibold text-white/60">Super Admin</p>
            </div>
          </div>
        </div>
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
          className="mt-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2.2} />
          Cerrar sesión
        </button>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-brand-800 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sun to-accent text-lg">
            🎁
          </span>
          <p className="font-extrabold">
            Premia<span className="text-sun">Ya</span>{' '}
            <span className="text-xs font-semibold text-white/60">Super Admin</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10"
          aria-label="Cerrar sesión"
        >
          <LogOut size={17} />
        </button>
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
                isActive ? 'text-brand-600' : 'text-ink/45'
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
