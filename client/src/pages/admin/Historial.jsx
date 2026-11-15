import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader, inputClass, EmptyState, movementMeta } from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/theme.js';

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los movimientos' },
  { value: 'register', label: 'Registros' },
  { value: 'stamp', label: 'Sellos' },
  { value: 'redeem', label: 'Canjes' },
];

export default function Historial() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (type) params.set('type', type);
      api.get(`/api/movements?${params}`).then(setRows).catch(() => setRows([]));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, type]);

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Historial"
        subtitle="Todos los movimientos del programa"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            className={`${inputClass} pl-11`}
            placeholder="Buscar por cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={`${inputClass} sm:w-56`}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {!rows ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon="📭" title="No hay movimientos con esos filtros" />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm shadow-ink/5">
          <div className="divide-y divide-ink/5">
            {rows.map((m) => {
              const meta = movementMeta(m.type);
              const Icon = meta.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.classes}`}>
                    <Icon size={16} strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/clientes/${m.customer_id}`}
                      className="truncate text-sm font-extrabold hover:underline"
                    >
                      {m.customer_name}
                    </Link>
                    <p className="truncate text-xs font-medium text-ink/55">{m.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${meta.classes}`}>
                      {meta.label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-ink/40">
                      {formatDateTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
