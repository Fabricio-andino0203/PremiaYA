import { useEffect, useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';
import {
  PageHeader, Card, PrimaryButton, SecondaryButton, Field, inputClass, ErrorNote,
} from '../../components/ui.jsx';
import { THEMES } from '../../lib/theme.js';

const EMPTY = {
  name: '', slug: '', icon: '🎁', theme: 'berry', plan_id: '',
  owner_name: '', owner_email: '', owner_password: '',
};
const ICONS = ['🎁', '🥤', '☕', '🍦', '🍔', '🍕', '🧋', '🍰', '🌮', '🏪'];

export default function Negocios() {
  const [businesses, setBusinesses] = useState(null);
  const [plans, setPlans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/super/businesses').then(setBusinesses);

  useEffect(() => {
    load();
    api.get('/api/super/plans').then(setPlans);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/super/businesses', {
        ...form,
        plan_id: Number(form.plan_id) || plans[0]?.id,
      });
      setModalOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const update = async (id, body) => {
    await api.patch(`/api/super/businesses/${id}`, body);
    load();
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Negocios"
        subtitle="Cuentas de la plataforma"
        action={
          <PrimaryButton onClick={() => { setForm(EMPTY); setFormError(''); setModalOpen(true); }}>
            <Plus size={16} /> Nuevo negocio
          </PrimaryButton>
        }
      />

      {!businesses ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <Card key={b.id} className={`flex flex-wrap items-center gap-3 ${b.status === 'suspended' ? 'opacity-60' : ''}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream text-xl">
                {b.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">
                  {b.name}
                  {b.status === 'suspended' && (
                    <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-600">
                      SUSPENDIDO
                    </span>
                  )}
                </p>
                <p className="truncate text-xs font-medium text-ink/50">
                  /{b.slug} · {b.owner_email} · {b.customer_count} clientes
                </p>
              </div>
              <select
                className="rounded-xl border border-ink/10 bg-cream px-2.5 py-1.5 text-xs font-bold"
                value={b.plan_id || ''}
                onChange={(e) => update(b.id, { plan_id: Number(e.target.value) })}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price_monthly})
                  </option>
                ))}
              </select>
              <SecondaryButton
                className="!px-3 !py-1.5 text-xs"
                onClick={() => update(b.id, { status: b.status === 'active' ? 'suspended' : 'active' })}
              >
                {b.status === 'active' ? 'Suspender' : 'Reactivar'}
              </SecondaryButton>
              <a
                href={`/r/${b.slug}`}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-xl text-ink/40 hover:bg-ink/5"
                title="Página de registro"
              >
                <ExternalLink size={15} />
              </a>
            </Card>
          ))}
        </div>
      )}

      <Modal title="Nuevo negocio" open={modalOpen} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del negocio">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Café Aroma"
            />
          </Field>
          <Field label="Identificador (slug)" hint="Para el enlace de registro: /r/slug">
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              placeholder="cafe-aroma"
            />
          </Field>
          <Field label="Ícono">
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setForm({ ...form, icon: i })}
                  className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${
                    form.icon === i ? 'bg-brand-100 ring-2 ring-brand-500' : 'bg-cream'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="flex gap-2 pt-1">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setForm({ ...form, theme: key })}
                  className={`h-8 w-8 rounded-full ${theme.grad} ${
                    form.theme === key ? 'scale-110 ring-4 ring-ink/20' : ''
                  }`}
                />
              ))}
            </div>
          </Field>
          <Field label="Plan">
            <select
              className={inputClass}
              value={form.plan_id}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price_monthly}/mes
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre del dueño">
            <input
              className={inputClass}
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </Field>
          <Field label="Correo del dueño">
            <input
              type="email"
              className={inputClass}
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
            />
          </Field>
          <Field label="Contraseña inicial" hint="Mínimo 8 caracteres; el dueño debería cambiarla.">
            <input
              type="password"
              className={inputClass}
              value={form.owner_password}
              onChange={(e) => setForm({ ...form, owner_password: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <ErrorNote>{formError}</ErrorNote>
            <PrimaryButton type="submit" disabled={saving} className="mt-2 w-full">
              {saving ? 'Creando…' : 'Crear negocio'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
