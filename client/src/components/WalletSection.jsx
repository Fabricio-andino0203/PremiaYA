import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import Modal from './Modal.jsx';
import { formatDateTime, timeAgo } from '../lib/theme.js';

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function DemoBanner() {
  return (
    <div className="rounded-2xl bg-amber-100 px-4 py-3 text-center">
      <p className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
        Vista previa · Modo demo
      </p>
      <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-700">
        Esta tarjeta <strong>no está instalada</strong> en una billetera real. La
        integración oficial con Apple Wallet y Google Wallet se activa al
        configurar los certificados del negocio.
      </p>
    </div>
  );
}

function ApplePassPreview({ pass, serial }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-xl">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 text-base">
            {pass.icon}
          </span>
          <span className="text-sm font-extrabold">{pass.businessName}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
          Tarjeta
        </span>
      </div>
      <div className="px-5 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Sellos</p>
        <p className="text-3xl font-extrabold">
          {pass.stamps}/{pass.stampsRequired}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${pass.progress}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Cliente</p>
          <p className="truncate text-sm font-bold">{pass.customerName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {pass.rewardReady ? 'Recompensa lista 🎁' : 'Próxima recompensa'}
          </p>
          <p className="truncate text-sm font-bold">{pass.rewardName || '—'}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center gap-1.5 bg-white/95 py-4">
        <div className="rounded-xl bg-white p-2">
          <QRCodeSVG value={pass.qrValue} size={110} level="M" />
        </div>
        <p className="text-[11px] font-bold tracking-widest text-ink/60">{pass.cardId}</p>
        <p className="text-[9px] font-medium text-ink/35">Serie: {serial}</p>
      </div>
    </div>
  );
}

function GooglePassPreview({ pass, serial }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-xl">
      <div className="h-2 bg-brand-600" />
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-base">
          {pass.icon}
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-ink/50">{pass.businessName}</p>
          <p className="text-sm font-extrabold">{pass.templateName || 'Tarjeta de fidelidad'}</p>
        </div>
      </div>
      <div className="px-5 pt-4">
        <p className="text-lg font-extrabold">{pass.customerName}</p>
        <p className="text-[11px] font-semibold text-ink/45">ID: {pass.cardId}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">Sellos</p>
          <p className="text-2xl font-extrabold text-brand-600">
            {pass.stamps}/{pass.stampsRequired}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink/45">
            {pass.rewardReady ? 'Recompensa lista 🎁' : 'Próxima recompensa'}
          </p>
          <p className="truncate text-sm font-bold">{pass.rewardName || '—'}</p>
        </div>
      </div>
      <div className="mx-5 mt-3 h-2 overflow-hidden rounded-full bg-ink/5">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${pass.progress}%` }}
        />
      </div>
      <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-ink/5 py-4">
        <QRCodeSVG value={pass.qrValue} size={110} level="M" />
        <p className="text-[9px] font-medium text-ink/35">Objeto: {serial}</p>
      </div>
    </div>
  );
}

export default function WalletSection({ code }) {
  const [passes, setPasses] = useState([]);
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null); // response of /add
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const platform = detectPlatform();

  const loadPasses = () =>
    api
      .get(`/api/wallet/${encodeURIComponent(code)}/passes`)
      .then((d) => {
        setPasses(d.passes);
        setStatus(d.status);
      })
      .catch(() => {});

  useEffect(() => {
    loadPasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const add = async (target) => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/api/wallet/${encodeURIComponent(code)}/add`, {
        platform: target,
      });
      if (res.demo) {
        setPreview(res);
        loadPasses();
      } else if (res.save_url) {
        window.open(res.save_url, '_blank');
        loadPasses();
      } else if (res.download_url) {
        window.location.assign(res.download_url);
        loadPasses();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const passFor = (p) => passes.find((x) => x.platform === p);
  const isDemo = status && (!status.apple.configured || !status.google.configured);

  const appleButton = (
    <div key="apple">
      <button
        disabled={busy}
        onClick={() => add('apple')}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50"
      >
        <Wallet size={18} /> Agregar a Apple Wallet
      </button>
      {passFor('apple') && (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-green-700">
          <CheckCircle2 size={12} /> Agregada (demo) · actualizada {timeAgo(passFor('apple').updated_at)}
        </p>
      )}
    </div>
  );

  const googleButton = (
    <div key="google">
      <button
        disabled={busy}
        onClick={() => add('google')}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-ink/15 bg-white px-5 py-3.5 text-sm font-bold text-ink shadow-sm transition hover:bg-ink/5 active:scale-[0.98] disabled:opacity-50"
      >
        <Wallet size={18} /> Agregar a Google Wallet
      </button>
      {passFor('google') && (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-green-700">
          <CheckCircle2 size={12} /> Agregada (demo) · actualizada {timeAgo(passFor('google').updated_at)}
        </p>
      )}
    </div>
  );

  const buttons =
    platform === 'ios'
      ? [appleButton, googleButton]
      : platform === 'android'
        ? [googleButton, appleButton]
        : [appleButton, googleButton];

  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
        <Wallet size={16} strokeWidth={2.5} />
        Llevala en tu billetera
      </h2>
      <div className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
        {isDemo && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-700">
            ⚠️ Modo DEMO: la instalación real se habilita con los certificados oficiales.
          </p>
        )}
        {buttons}
        {error && (
          <p className="text-center text-xs font-semibold text-rose-600">{error}</p>
        )}
        <p className="text-center text-[11px] font-medium leading-snug text-ink/45">
          Tu tarjeta se actualiza automáticamente en tu billetera cada vez que sumás
          un sello o canjeás un premio.
        </p>
      </div>

      <Modal
        title={
          preview?.platform === 'apple'
            ? 'Tu tarjeta en Apple Wallet'
            : 'Tu tarjeta en Google Wallet'
        }
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <div className="space-y-4">
            <DemoBanner />
            {preview.platform === 'apple' ? (
              <ApplePassPreview pass={preview.pass} serial={preview.record.serial} />
            ) : (
              <GooglePassPreview pass={preview.pass} serial={preview.record.serial} />
            )}
            <p className="text-center text-[11px] font-semibold text-ink/45">
              Última actualización automática: {formatDateTime(preview.record.updated_at)}
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
