import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stamp, Gift, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader, Card, MovementRow, EmptyState } from '../../components/ui.jsx';

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent}`}>
        <Icon size={22} strokeWidth={2.3} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-tight">{value}</p>
        <p className="truncate text-xs font-bold uppercase tracking-wide text-ink/45">{label}</p>
        {sub && <p className="mt-0.5 text-xs font-semibold text-ink/50">{sub}</p>}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!stats) return <p className="animate-pulse text-sm text-ink/40">Cargando…</p>;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del programa de fidelización"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Clientes"
          value={stats.totalCustomers}
          accent="bg-sky-100 text-sky-600"
          sub={`+${stats.newCustomersThisWeek} esta semana`}
        />
        <StatCard
          icon={Stamp}
          label="Sellos entregados"
          value={stats.totalStamps}
          accent="bg-amber-100 text-amber-600"
          sub={`+${stats.stampsThisWeek} esta semana`}
        />
        <StatCard
          icon={Gift}
          label="Premios pendientes"
          value={stats.pendingRewards}
          accent="bg-rose-100 text-rose-600"
          sub="Listos para canjear"
        />
        <StatCard
          icon={Trophy}
          label="Premios canjeados"
          value={stats.redeemedRewards}
          accent="bg-violet-100 text-violet-600"
          sub="Histórico"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
            Actividad reciente
          </h2>
          {stats.recent.length === 0 ? (
            <EmptyState title="Sin actividad todavía" />
          ) : (
            <div className="divide-y divide-ink/5">
              {stats.recent.map((m) => (
                <MovementRow key={m.id} movement={m} showCustomer relative />
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              <TrendingUp size={16} /> Fidelización
            </h2>
            <p className="text-3xl font-extrabold">{stats.completionRate}%</p>
            <p className="text-xs font-semibold text-ink/50">
              de las tarjetas llegaron a completarse
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-700"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              Acciones rápidas
            </h2>
            <div className="flex flex-col gap-2">
              <Link
                to="/admin/sellos"
                className="rounded-2xl bg-ink px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-ink/85"
              >
                ➕ Registrar un sello
              </Link>
              <Link
                to="/admin/clientes"
                className="rounded-2xl border border-ink/10 px-4 py-2.5 text-center text-sm font-bold text-ink/70 transition hover:bg-ink/5"
              >
                👤 Nuevo cliente
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
