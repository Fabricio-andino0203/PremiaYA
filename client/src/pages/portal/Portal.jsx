import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Gift, History as HistoryIcon, QrCode } from 'lucide-react';
import { api } from '../../lib/api.js';
import StampCard from '../../components/StampCard.jsx';
import BusinessAvatar from '../../components/BusinessAvatar.jsx';
import WalletSection from '../../components/WalletSection.jsx';
import { MovementRow } from '../../components/ui.jsx';
import { themeOf } from '../../lib/theme.js';

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
      <Icon size={16} strokeWidth={2.5} />
      {children}
    </h2>
  );
}

export default function Portal() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/customers/by-code/${encodeURIComponent(code)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [code]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-5xl">🫠</p>
          <h1 className="mt-4 text-xl font-extrabold">Tarjeta no encontrada</h1>
          <p className="mt-2 text-sm text-ink/60">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="animate-pulse-soft text-4xl">🥤</p>
      </div>
    );
  }

  const activeCards = data.cards.filter((c) => c.status !== 'redeemed');
  const mainCard = activeCards[0];
  const readyCards = activeCards.filter((c) => c.status === 'reward_ready');
  const firstName = data.name.split(' ')[0];
  const portalUrl = `${window.location.origin}/c/${data.code}`;

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6 sm:py-10">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <BusinessAvatar business={data.business} size="md" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-extrabold">{data.business?.name || 'PremiaYa'}</p>
            <p className="text-xs font-medium text-ink/50">Recompensas</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-ink/60 shadow-sm">
          {data.code}
        </span>
      </header>

      <h1 className="text-2xl font-extrabold tracking-tight">
        ¡Hola, {firstName}! 👋
      </h1>
      <p className="mt-1 text-sm text-ink/55">Esta es tu tarjeta de recompensas.</p>

      {/* Reward ready banner */}
      {readyCards.length > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 p-4 text-ink shadow-lg shadow-amber-200 animate-slide-up">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="text-sm font-extrabold">¡Tenés una recompensa lista!</p>
            <p className="text-xs font-semibold text-ink/70">
              Mostrá esta pantalla en caja para canjear tu {readyCards[0].reward_name?.toLowerCase()}.
            </p>
          </div>
        </div>
      )}

      {/* Main card(s) */}
      <div className="mt-5 space-y-4">
        {activeCards.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 p-8 text-center text-sm font-semibold text-ink/50">
            Todavía no tenés una tarjeta activa. Pedila en el local 🙌
          </div>
        ) : (
          activeCards.map((card) => (
            <StampCard
              key={card.id}
              name={card.template_name}
              brand={data.business?.name || 'PremiaYa'}
              icon={card.icon}
              color={card.color}
              stampsRequired={card.stamps_required}
              stamps={card.stamps}
              status={card.status}
              rewardName={card.reward_name}
            />
          ))
        )}
      </div>

      {/* Progress message */}
      {mainCard && mainCard.status === 'active' && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm font-semibold text-ink/70 shadow-sm">
          Te falta{mainCard.stamps_required - mainCard.stamps === 1 ? '' : 'n'}{' '}
          <span className={`font-extrabold ${themeOf(mainCard.color).text}`}>
            {mainCard.stamps_required - mainCard.stamps} sello
            {mainCard.stamps_required - mainCard.stamps === 1 ? '' : 's'}
          </span>{' '}
          para tu próxima recompensa:
          <br />
          <span className="font-extrabold">
            {mainCard.icon} {mainCard.reward_name}
          </span>
        </p>
      )}

      {/* QR */}
      <section className="mt-8">
        <SectionTitle icon={QrCode}>Tu código personal</SectionTitle>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-white p-3 ring-8 ring-cream">
            <QRCodeSVG value={portalUrl} size={168} level="M" />
          </div>
          <p className="text-lg font-extrabold tracking-widest">{data.code}</p>
          <p className="text-center text-xs font-medium text-ink/50">
            Mostrá este código en caja para sumar sellos con tu compra.
          </p>
        </div>
      </section>

      {/* Wallet */}
      <WalletSection code={data.code} />

      {/* Available rewards */}
      <section className="mt-8">
        <SectionTitle icon={Gift}>Premios disponibles</SectionTitle>
        <div className="space-y-2.5">
          {data.available_rewards.map((t) => {
            const theme = themeOf(t.color);
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${theme.soft}`}>
                  {t.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{t.reward_name || t.name}</p>
                  <p className="truncate text-xs font-medium text-ink/50">{t.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${theme.chip}`}>
                  {t.stamps_required} sellos
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section className="mt-8">
        <SectionTitle icon={HistoryIcon}>Tu historial</SectionTitle>
        <div className="divide-y divide-ink/5 rounded-3xl bg-white px-4 py-1 shadow-sm">
          {data.movements.length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-ink/45">
              Todavía no hay movimientos.
            </p>
          ) : (
            data.movements.slice(0, 20).map((m) => <MovementRow key={m.id} movement={m} />)
          )}
        </div>
      </section>

      <footer className="mt-10 pb-6 text-center text-xs font-medium text-ink/35">
        <Sparkles size={14} className="mx-auto mb-1" />
        Impulsado por 🎁 Premia<span className="text-sun">Ya</span> · Sumá sellos, ganá premios
      </footer>
    </div>
  );
}
