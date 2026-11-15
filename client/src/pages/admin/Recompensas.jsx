import { useEffect, useState } from 'react';
import { Plus, Gift } from 'lucide-react';
import { api } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';
import Confetti from '../../components/Confetti.jsx';
import {
  PageHeader, Card, PrimaryButton, Field, inputClass, ErrorNote, SuccessNote,
  EmptyState, MovementRow,
} from '../../components/ui.jsx';
import { themeOf, timeAgo } from '../../lib/theme.js';

export default function Recompensas() {
  const [data, setData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', stamps_required: 8 });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [burst, setBurst] = useState(0);

  const load = () => api.get('/api/rewards').then(setData);

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/api/rewards', {
        ...form,
        stamps_required: Number(form.stamps_required),
      });
      setModalOpen(false);
      setForm({ name: '', description: '', stamps_required: 8 });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const redeem = async (cardId) => {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await api.post(`/api/cards/${cardId}/redeem`);
      setOk(res.message);
      setBurst(Date.now());
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="animate-pulse text-sm text-ink/40">Cargando…</p>;

  return (
    <div className="animate-slide-up">
      <Confetti burst={burst} />
      <PageHeader
        title="Recompensas"
        subtitle="Premios del programa y canjes pendientes"
        action={
          <PrimaryButton onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nueva recompensa
          </PrimaryButton>
        }
      />

      <ErrorNote>{error}</ErrorNote>
      <SuccessNote>{ok}</SuccessNote>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* Pending redemptions */}
        <Card>
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/55">
            🎁 Pendientes de canje ({data.pending.length})
          </h2>
          {data.pending.length === 0 ? (
            <EmptyState icon="✨" title="No hay canjes pendientes" hint="Cuando un cliente complete su tarjeta, aparecerá acá." />
          ) : (
            <div className="space-y-2.5">
              {data.pending.map((p) => {
                const theme = themeOf(p.color);
                return (
                  <div key={p.card_id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${theme.soft}`}>
                      {p.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{p.customer_name}</p>
                      <p className="truncate text-xs font-medium text-ink/50">
                        {p.reward_name || p.template_name} · completada {timeAgo(p.completed_at)}
                      </p>
                    </div>
                    <PrimaryButton
                      disabled={busy}
                      onClick={() => redeem(p.card_id)}
                      className="!px-3.5 !py-2 text-xs"
                    >
                      <Gift size={14} /> Canjear
                    </PrimaryButton>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          {/* Rewards catalog */}
          <Card>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              Catálogo de premios
            </h2>
            <div className="divide-y divide-ink/5">
              {data.rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{r.name}</p>
                    <p className="truncate text-xs font-medium text-ink/50">{r.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-extrabold text-ink/60">
                      {r.stamps_required} sellos
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-ink/40">
                      {r.times_redeemed} canje{r.times_redeemed === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Redeemed history */}
          <Card>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              Canjes realizados
            </h2>
            {data.redeemed.length === 0 ? (
              <EmptyState title="Todavía no hay canjes" />
            ) : (
              <div className="divide-y divide-ink/5">
                {data.redeemed.slice(0, 10).map((m) => (
                  <MovementRow key={m.id} movement={{ ...m, type: 'redeem' }} showCustomer />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal title="Nueva recompensa" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Smoothie gratis"
              autoFocus
            />
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Cualquier smoothie mediano del menú"
            />
          </Field>
          <Field label="Sellos necesarios" hint="Vinculá esta recompensa a una tarjeta desde la sección Tarjetas.">
            <input
              type="number"
              min="1"
              max="20"
              className={inputClass}
              value={form.stamps_required}
              onChange={(e) => setForm({ ...form, stamps_required: e.target.value })}
            />
          </Field>
          <ErrorNote>{formError}</ErrorNote>
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? 'Guardando…' : 'Crear recompensa'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
