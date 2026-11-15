import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';
import {
  PageHeader, Card, PrimaryButton, SecondaryButton, Field, inputClass, ErrorNote,
} from '../../components/ui.jsx';

const EMPTY = { name: '', description: '', price_monthly: 0, max_customers: '' };

export default function Planes() {
  const [plans, setPlans] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/super/plans').then(setPlans);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price_monthly: p.price_monthly,
      max_customers: p.max_customers ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const body = {
      ...form,
      price_monthly: Number(form.price_monthly),
      max_customers: form.max_customers === '' ? null : Number(form.max_customers),
    };
    try {
      if (editing) await api.patch(`/api/super/plans/${editing}`, body);
      else await api.post('/api/super/plans', body);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Planes"
        subtitle="Precios y límites de la plataforma"
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus size={16} /> Nuevo plan
          </PrimaryButton>
        }
      />

      {!plans ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-extrabold">{p.name}</h3>
                <button
                  onClick={() => openEdit(p)}
                  className="grid h-8 w-8 place-items-center rounded-xl text-ink/40 hover:bg-ink/5"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-1 text-3xl font-extrabold text-brand-600">
                ${p.price_monthly}
                <span className="text-sm font-bold text-ink/40">/mes</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-ink/55">{p.description}</p>
              <div className="mt-4 space-y-1 border-t border-ink/5 pt-3 text-xs font-bold text-ink/60">
                <p>👥 {p.max_customers ? `Hasta ${p.max_customers} clientes` : 'Clientes ilimitados'}</p>
                <p>🏪 {p.business_count} negocio{p.business_count === 1 ? '' : 's'} en este plan</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal title={editing ? 'Editar plan' : 'Nuevo plan'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio mensual ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.price_monthly}
                onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
              />
            </Field>
            <Field label="Límite de clientes" hint="Vacío = ilimitado">
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.max_customers}
                onChange={(e) => setForm({ ...form, max_customers: e.target.value })}
              />
            </Field>
          </div>
          <ErrorNote>{formError}</ErrorNote>
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear plan'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
