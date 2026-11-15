import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Upload, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import BusinessAvatar from '../../components/BusinessAvatar.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { THEMES, ICON_OPTIONS, formatDate } from '../../lib/theme.js';
import {
  PageHeader, Card, PrimaryButton, Field, inputClass, ErrorNote, SuccessNote, EmptyState,
} from '../../components/ui.jsx';

const BUSINESS_ICONS = ['🎁', '🥤', '☕', '🍦', '🍔', '🍕', '🧋', '🍰', '🌮', '🏪'];

export default function Configuracion() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const load = () =>
    api.get('/api/business/me').then((d) => {
      setData(d);
      setForm({
        name: d.business.name,
        icon: d.business.icon,
        theme: d.business.theme,
        whatsapp_country_code: d.business.whatsapp_country_code,
        logo: d.business.logo || null,
      });
    });

  const pickLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const max = 256;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let dataUrl = canvas.toDataURL('image/png');
      if (dataUrl.length > 380000) dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (dataUrl.length > 380000) {
        setError('La imagen es demasiado pesada. Probá con otra más simple.');
        return;
      }
      setForm((f) => ({ ...f, logo: dataUrl }));
    } catch {
      setError('No se pudo leer la imagen. Usá un PNG o JPG.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!data || !form) return <p className="animate-pulse text-sm text-ink/40">Cargando…</p>;

  const b = data.business;
  const registroUrl = `${window.location.origin}/r/${b.slug}`;
  const usagePct = b.plan_max_customers
    ? Math.min(100, Math.round((b.customer_count / b.plan_max_customers) * 100))
    : null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api.patch('/api/business/me', form);
      setOk('Cambios guardados.');
      await load();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(registroUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // portapapeles no disponible
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader title="Ajustes" subtitle="Personalización, registro de clientes y tu plan" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Marca */}
          <Card>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              Tu marca
            </h2>
            <form onSubmit={save} className="space-y-4">
              <Field label="Logo" hint="PNG, JPG o WebP. Se ajusta a 256px. Si no subís logo, se usa el ícono.">
                <div className="flex items-center gap-3">
                  <BusinessAvatar business={{ ...data.business, ...form }} size="lg" />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={pickLogo}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-2 text-xs font-bold text-ink/70 transition hover:bg-ink/5"
                  >
                    <Upload size={14} /> Subir logo
                  </button>
                  {form.logo && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo: null }))}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 size={14} /> Quitar
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Nombre del negocio">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Ícono">
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_ICONS.map((i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setForm({ ...form, icon: i })}
                      className={`grid h-10 w-10 place-items-center rounded-xl text-lg transition ${
                        form.icon === i ? 'bg-brand-100 ring-2 ring-brand-500' : 'bg-cream hover:bg-brand-50'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Color de marca">
                <div className="flex gap-2.5">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      type="button"
                      key={key}
                      title={theme.label}
                      onClick={() => setForm({ ...form, theme: key })}
                      className={`h-9 w-9 rounded-full ${theme.grad} transition ${
                        form.theme === key ? 'scale-110 ring-4 ring-ink/20' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </Field>
              <Field
                label="Código de país para WhatsApp"
                hint="Se usa al enviar la tarjeta por WhatsApp (ej: 506 Costa Rica, 504 Honduras, 52 México)."
              >
                <input
                  className={inputClass}
                  value={form.whatsapp_country_code}
                  onChange={(e) => setForm({ ...form, whatsapp_country_code: e.target.value })}
                  placeholder="506"
                />
              </Field>
              <ErrorNote>{error}</ErrorNote>
              <SuccessNote>{ok}</SuccessNote>
              <PrimaryButton type="submit" disabled={busy} className="w-full">
                {busy ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </form>
          </Card>

          {/* Plan */}
          <Card>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/55">
              Tu plan
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold">Plan {b.plan_name}</p>
                <p className="text-xs font-semibold text-ink/50">
                  ${b.plan_price}/mes ·{' '}
                  {b.plan_max_customers ? `hasta ${b.plan_max_customers} clientes` : 'clientes ilimitados'}
                </p>
              </div>
              <span className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-extrabold text-brand-700">
                {b.customer_count} cliente{b.customer_count === 1 ? '' : 's'}
              </span>
            </div>
            {usagePct !== null && (
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    usagePct >= 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-brand-500 to-accent'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            <p className="mt-3 text-xs font-medium text-ink/45">
              Para cambiar de plan, contactá a PremiaYa.
            </p>

            <h3 className="mb-1 mt-5 text-xs font-extrabold uppercase tracking-wide text-ink/50">
              Historial de pagos
            </h3>
            {data.payments.length === 0 ? (
              <EmptyState icon="🧾" title="Sin pagos registrados" />
            ) : (
              <div className="divide-y divide-ink/5">
                {data.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-bold">
                        ${p.amount} · {p.plan_name || 'Pago'}
                      </p>
                      <p className="text-xs font-medium text-ink/45">
                        {p.period_label || formatDate(p.created_at)} · {p.method}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-ink/40">{formatDate(p.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* QR de registro */}
        <Card className="self-start">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/55">
            QR de auto-registro
          </h2>
          <p className="mb-4 text-sm font-medium text-ink/60">
            Imprimí este QR y ponelo en el mostrador: tus clientes escanean, se registran
            solos y obtienen su tarjeta digital al instante.
          </p>
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-cream p-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={registroUrl} size={180} level="M" />
            </div>
            <p className="break-all text-center text-xs font-bold text-ink/60">{registroUrl}</p>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-2 text-xs font-bold text-ink/70 transition hover:bg-ink/5"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a
              href={registroUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Ver página de registro →
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
