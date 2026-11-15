import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import Brand from '../components/Brand.jsx';
import { Field, inputClass, ErrorNote, PrimaryButton } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'superadmin' ? '/super' : '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-cream to-brand-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Brand size="lg" />
          <p className="text-sm font-semibold text-ink/55">
            Premia a tus clientes. Hazlos volver.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-4xl bg-white p-6 shadow-xl shadow-brand-100">
          <h1 className="text-lg font-extrabold">Iniciar sesión</h1>
          <Field label="Correo">
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@negocio.com"
              autoFocus
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <PrimaryButton type="submit" disabled={busy} className="w-full">
            {busy ? 'Entrando…' : 'Entrar'}
          </PrimaryButton>
        </form>

        <div className="mt-4 rounded-3xl border border-dashed border-brand-200 bg-white/60 p-4 text-xs font-medium text-ink/55">
          <p className="mb-1 font-extrabold text-ink/70">Credenciales de demo</p>
          <p>Negocio: <span className="font-bold">demo@fresko.com</span> / fresko123</p>
          <p>Super admin: <span className="font-bold">superadmin@premiaya.com</span> / PremiaYa#2026</p>
        </div>
      </div>
    </div>
  );
}
