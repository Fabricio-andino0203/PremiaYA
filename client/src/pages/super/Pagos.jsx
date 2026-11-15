import { useEffect, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { api } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';
import {
  PageHeader, Card, PrimaryButton, Field, inputClass, ErrorNote, EmptyState,
} from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/theme.js';

const EMPTY = { business_id: '', plan_id: '', amount: '', method: 'SINPE', period_label: '', note: '' };

export default function Pagos() {
  const [payments, setPayments] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/super/payments').then(setPayments);

  useEffect(() => {
    load();
    api.get('/api/super/businesses').then(setBusinesses);
    api.get('/api/super/plans').then(setPlans);
  }, []);

  const pickPlan = (planId) => {
    const plan = plans.find((p) => p.id === Number(planId));
    setForm((f) => ({ ...f, plan_id: planId, amount: plan ? String(plan.price_monthly) : f.amount }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/super/payments', {
        ...form,
        business_id: Number(form.business_id),
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        amount: Number(form.amount),
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

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Pagos"
        subtitle="Registro manual de pagos de los negocios (la pasarela de pago se integra después)"
        action={
          <PrimaryButton onClick={() => { setForm(EMPTY); setFormError(''); setModalOpen(true); }}>
            <Plus size={16} /> Registrar pago
          </PrimaryButton>
        }
      />

      {!payments ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : payments.length === 0 ? (
        <EmptyState icon="🧾" title="Todavía no hay pagos registrados" />
      ) : (
        <Card>
          <div className="divide-y divide-ink/5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-100 text-green-700">
                  <Receipt size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">
                    {p.business_icon} {p.business_name}
                  </p>
                  <p className="truncate text-xs font-medium text-ink/50">
                    {p.plan_name || 'Pago'} · {p.period_label || 'sin período'} · {p.method}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-green-700">${p.amount}</p>
                  <p className="text-[11px] font-semibold text-ink/40">{formatDateTime(p.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal title="Registrar pago" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Negocio">
            <select
              className={inputClass}
              value={form.business_id}
              onChange={(e) => setForm({ ...form, business_id: e.target.value })}
            >
              <option value="">— Elegí un negocio —</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icon} {b.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select className={inputClass} value={form.plan_id} onChange={(e) => pickPlan(e.target.value)}>
                <option value="">— Sin plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monto ($)">
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Método">
              <select
                className={inputClass}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {['SINPE', 'Transferencia', 'Efectivo', 'Tarjeta', 'Otro'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Período">
              <input
                className={inputClass}
                value={form.period_label}
                onChange={(e) => setForm({ ...form, period_label: e.target.value })}
                placeholder="Ej: Diciembre 2026"
              />
            </Field>
          </div>
          <Field label="Nota (opcional)">
            <input
              className={inputClass}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
          <ErrorNote>{formError}</ErrorNote>
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? 'Guardando…' : 'Registrar pago'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
