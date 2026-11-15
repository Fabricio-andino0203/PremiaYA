import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api } from '../../lib/api.js';
import StampCard from '../../components/StampCard.jsx';
import Modal from '../../components/Modal.jsx';
import {
  PageHeader, PrimaryButton, SecondaryButton, Field, inputClass, ErrorNote,
} from '../../components/ui.jsx';
import { THEMES, ICON_OPTIONS } from '../../lib/theme.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  stamps_required: 8,
  reward_id: '',
  color: 'mango',
  icon: '🥤',
};

export default function Tarjetas() {
  const [templates, setTemplates] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // template id or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/card-templates').then(setTemplates);

  useEffect(() => {
    load();
    api.get('/api/rewards').then((d) => setRewards(d.rewards));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t.id);
    setForm({
      name: t.name,
      description: t.description,
      stamps_required: t.stamps_required,
      reward_id: t.reward_id || '',
      color: t.color,
      icon: t.icon,
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
      stamps_required: Number(form.stamps_required),
      reward_id: form.reward_id ? Number(form.reward_id) : null,
    };
    try {
      if (editing) await api.patch(`/api/card-templates/${editing}`, body);
      else await api.post('/api/card-templates', body);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    await api.patch(`/api/card-templates/${t.id}`, { active: !t.active });
    load();
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Tarjetas"
        subtitle="Diseñá las tarjetas de recompensas del negocio"
        action={
          <PrimaryButton onClick={openCreate}>
            <Plus size={16} /> Nueva tarjeta
          </PrimaryButton>
        }
      />

      {!templates ? (
        <p className="animate-pulse text-sm text-ink/40">Cargando…</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className={`space-y-3 ${t.active ? '' : 'opacity-55'}`}>
              <StampCard
                name={t.name}
                icon={t.icon}
                color={t.color}
                stampsRequired={t.stamps_required}
                stamps={Math.min(3, t.stamps_required)}
                rewardName={t.reward_name}
                animate={false}
                compact
              />
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold text-ink/50">
                  {t.active_cards} en curso · {t.completed_cards} completadas
                  {!t.active && ' · Inactiva'}
                </p>
                <div className="flex gap-2">
                  <SecondaryButton className="!px-3 !py-1.5 text-xs" onClick={() => openEdit(t)}>
                    <Pencil size={13} /> Editar
                  </SecondaryButton>
                  <SecondaryButton className="!px-3 !py-1.5 text-xs" onClick={() => toggleActive(t)}>
                    {t.active ? 'Desactivar' : 'Activar'}
                  </SecondaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Smoothie Lovers"
              />
            </Field>
            <Field label="Descripción">
              <input
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Juntá 8 sellos y llevate un smoothie"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sellos necesarios">
                <input
                  type="number"
                  min="1"
                  max="20"
                  className={inputClass}
                  value={form.stamps_required}
                  onChange={(e) => setForm({ ...form, stamps_required: e.target.value })}
                />
              </Field>
              <Field label="Ícono">
                <select
                  className={inputClass}
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Recompensa final">
              <select
                className={inputClass}
                value={form.reward_id}
                onChange={(e) => setForm({ ...form, reward_id: e.target.value })}
              >
                <option value="">— Sin recompensa vinculada —</option>
                {rewards.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Color">
              <div className="flex gap-2.5">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    type="button"
                    key={key}
                    title={theme.label}
                    onClick={() => setForm({ ...form, color: key })}
                    className={`h-9 w-9 rounded-full ${theme.grad} transition ${
                      form.color === key ? 'ring-4 ring-ink/20 scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </Field>
            <ErrorNote>{formError}</ErrorNote>
            <PrimaryButton type="submit" disabled={saving} className="w-full">
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear tarjeta'}
            </PrimaryButton>
          </form>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/50">
              Vista previa
            </p>
            <StampCard
              name={form.name || 'Nombre de la tarjeta'}
              icon={form.icon}
              color={form.color}
              stampsRequired={Math.min(Math.max(Number(form.stamps_required) || 1, 1), 20)}
              stamps={Math.min(3, Number(form.stamps_required) || 1)}
              rewardName={rewards.find((r) => r.id === Number(form.reward_id))?.name}
              animate={false}
              compact
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
