import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import {
  PageHeader, Card, PrimaryButton, Field, inputClass, ErrorNote, EmptyState,
} from '../../components/ui.jsx';
import Modal from '../../components/Modal.jsx';
import { themeOf, formatDate } from '../../lib/theme.js';

export default function Clientes() {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', template_id: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (query) =>
    api
      .get(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then(setCustomers)
      .catch(() => setCustomers([]));

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.get('/api/card-templates').then((ts) => setTemplates(ts.filter((t) => t.active)));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/customers', {
        name: form.name,
        phone: form.phone,
        template_id: form.template_id ? Number(form.template_id) : undefined,
      });
      setModalOpen(false);
      setForm({ name: '', phone: '', template_id: '' });
      load(q.trim());
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Clientes"
        subtitle="Registrá clientes y consultá sus tarjetas"
        action={
          <PrimaryButton onClick={() => setModalOpen(true)}>
            <UserPlus size={16} /> Nuevo cliente
          </PrimaryButton>
        }
      />

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          className={`${inputClass} pl-11`}
          placeholder="Buscar por nombre, teléfono o código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!customers ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : customers.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={q ? 'No encontramos clientes con esa búsqueda' : 'Todavía no hay clientes'}
          hint={q ? 'Probá con otro nombre, teléfono o código.' : 'Registrá el primero con el botón "Nuevo cliente".'}
        />
      ) : (
        <div className="space-y-2.5">
          {customers.map((c) => {
            const theme = c.card ? themeOf(c.card.color) : null;
            return (
              <Link
                key={c.id}
                to={`/admin/clientes/${c.id}`}
                className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm shadow-ink/5 transition hover:shadow-md"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold ${
                    theme ? theme.soft + ' ' + theme.text : 'bg-ink/5 text-ink/40'
                  }`}
                >
                  {c.card ? c.card.icon : c.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{c.name}</p>
                  <p className="truncate text-xs font-medium text-ink/50">
                    {c.phone} · {c.code} · desde {formatDate(c.created_at)}
                  </p>
                </div>
                {c.card &&
                  (c.card.status === 'reward_ready' ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-700">
                      🎁 Premio listo
                    </span>
                  ) : (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${theme.chip}`}>
                      {c.card.stamps}/{c.card.stamps_required}
                    </span>
                  ))}
                <ChevronRight size={18} className="shrink-0 text-ink/25" />
              </Link>
            );
          })}
        </div>
      )}

      <Modal title="Nuevo cliente" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre completo">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ana Morales"
              autoFocus
            />
          </Field>
          <Field label="Teléfono">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ej: 8888-1234"
            />
          </Field>
          <Field label="Tarjeta inicial">
            <select
              className={inputClass}
              value={form.template_id}
              onChange={(e) => setForm({ ...form, template_id: e.target.value })}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name} ({t.stamps_required} sellos)
                </option>
              ))}
            </select>
          </Field>
          <ErrorNote>{formError}</ErrorNote>
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? 'Guardando…' : 'Registrar cliente'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
