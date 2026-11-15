import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Users, Stamp, DollarSign } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader, Card } from '../../components/ui.jsx';
import { timeAgo } from '../../lib/theme.js';

function Stat({ icon: Icon, label, value, accent, sub }) {
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

export default function SuperDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/super/overview').then(setData);
  }, []);

  if (!data) return <p className="animate-pulse text-sm text-ink/40">Cargando…</p>;

  return (
    <div className="animate-slide-up">
      <PageHeader title="Panel PremiaYa" subtitle="Visión general del SaaS" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Store}
          label="Negocios"
          value={data.totalBusinesses}
          accent="bg-brand-100 text-brand-700"
          sub={`${data.activeBusinesses} activos`}
        />
        <Stat
          icon={Users}
          label="Clientes finales"
          value={data.totalCustomers}
          accent="bg-sky-100 text-sky-600"
        />
        <Stat
          icon={Stamp}
          label="Sellos totales"
          value={data.totalStamps}
          accent="bg-amber-100 text-amber-600"
        />
        <Stat
          icon={DollarSign}
          label="Ingresos del mes"
          value={`$${data.revenueThisMonth}`}
          accent="bg-lime-100 text-green-700"
          sub={`$${data.revenueTotal} histórico`}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink/55">
            Negocios recientes
          </h2>
          <Link to="/super/negocios" className="text-xs font-bold text-brand-600 hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-ink/5">
          {data.businesses.slice(0, 8).map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-lg">
                {b.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{b.name}</p>
                <p className="truncate text-xs font-medium text-ink/50">
                  /{b.slug} · {b.customer_count} clientes · {b.stamp_count} sellos
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-extrabold text-brand-700">
                  {b.plan_name || 'Sin plan'}
                </span>
                <p className="mt-1 text-[11px] font-semibold text-ink/40">
                  creado {timeAgo(b.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
