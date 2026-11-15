import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { api } from '../lib/api.js';
import { themeOf } from '../lib/theme.js';
import { Field, inputClass, ErrorNote, PrimaryButton } from '../components/ui.jsx';

export default function Registro() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', template_id: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {code, already_registered}

  useEffect(() => {
    api
      .get(`/api/public/business/${encodeURIComponent(slug)}`)
      .then(setBusiness)
      .catch((e) => setLoadError(e.message));
  }, [slug]);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-5xl">🫠</p>
          <p className="mt-3 font-extrabold">{loadError}</p>
        </div>
      </div>
    );
  }
  if (!business) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="animate-pulse-soft text-4xl">🎁</p>
      </div>
    );
  }

  const theme = themeOf(business.theme);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/api/public/register', {
        slug,
        name: form.name,
        phone: form.phone,
        template_id: form.template_id || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-8">
      <header className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className={`grid h-16 w-16 place-items-center rounded-3xl text-3xl shadow-md ${theme.soft}`}>
          {business.icon}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm font-semibold text-ink/55">
            Sumate al programa de recompensas 🎉
          </p>
        </div>
      </header>

      {result ? (
        <div className="space-y-4 rounded-4xl bg-white p-6 text-center shadow-xl animate-slide-up">
          <PartyPopper className="mx-auto text-brand-600" size={40} />
          <h2 className="text-xl font-extrabold">
            {result.already_registered ? '¡Ya estabas registrado!' : '¡Listo! Ya sos parte 🎁'}
          </h2>
          <p className="text-sm font-medium text-ink/60">
            Tu código personal es
            <span className="mt-2 block text-2xl font-extrabold tracking-widest text-brand-600">
              {result.code}
            </span>
          </p>
          <Link
            to={`/c/${result.code}`}
            className="block w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
          >
            Ver mi tarjeta digital
          </Link>
          <p className="text-xs font-medium text-ink/45">
            Guardá el enlace de tu tarjeta: desde ahí podés agregarla a tu billetera.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-4xl bg-white p-6 shadow-xl">
          <Field label="Tu nombre completo">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Ana Morales"
              autoFocus
            />
          </Field>
          <Field label="Tu teléfono">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ej: 8888-1234"
            />
          </Field>
          {business.templates.length > 1 && (
            <Field label="Elegí tu tarjeta">
              <select
                className={inputClass}
                value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              >
                {business.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name} ({t.stamps_required} sellos → {t.reward_name})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <ErrorNote>{error}</ErrorNote>
          <PrimaryButton type="submit" disabled={busy} className="w-full py-3.5">
            {busy ? 'Registrando…' : 'Crear mi tarjeta'}
          </PrimaryButton>
        </form>
      )}

      <p className="mt-8 text-center text-xs font-semibold text-ink/35">
        Impulsado por 🎁 Premia<span className="text-sun">Ya</span>
      </p>
    </div>
  );
}
