import { useEffect, useState } from 'react';
import { Search, Stamp as StampIcon, Gift, QrCode } from 'lucide-react';
import { api } from '../../lib/api.js';
import StampCard from '../../components/StampCard.jsx';
import Confetti from '../../components/Confetti.jsx';
import {
  PageHeader, PrimaryButton, inputClass, ErrorNote, SuccessNote, EmptyState,
} from '../../components/ui.jsx';
import { themeOf } from '../../lib/theme.js';

export default function Sellos() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // full profile
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/api/customers?q=${encodeURIComponent(q.trim())}`).then(setResults).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const select = async (customer) => {
    setError('');
    setOk('');
    const profile = await api.get(`/api/customers/${customer.id}`);
    setSelected(profile);
  };

  const refresh = async () => {
    if (selected) setSelected(await api.get(`/api/customers/${selected.id}`));
  };

  const doStamp = async (cardId) => {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await api.post(`/api/cards/${cardId}/stamp`);
      setOk(res.message);
      if (res.reward_ready) setBurst(Date.now());
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doRedeem = async (cardId) => {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await api.post(`/api/cards/${cardId}/redeem`);
      setOk(res.message);
      setBurst(Date.now());
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const activeCards = selected ? selected.cards.filter((c) => c.status !== 'redeemed') : [];

  return (
    <div className="animate-slide-up">
      <Confetti burst={burst} />
      <PageHeader
        title="Registrar sellos"
        subtitle="Buscá al cliente por nombre, teléfono o su código QR"
      />

      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          className={`${inputClass} py-3.5 pl-11 text-base`}
          placeholder="Ej: Valentina, 8891-2345 o SMO-ABCD…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <p className="mb-5 flex items-center gap-1.5 text-xs font-medium text-ink/45">
        <QrCode size={14} /> Si el cliente muestra su QR, ingresá el código que aparece debajo (SMO-····).
      </p>

      {/* Search results */}
      {!selected && q.trim() && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <EmptyState icon="🔍" title="Sin resultados" hint="Verificá el nombre o código ingresado." />
          ) : (
            results.map((c) => {
              const theme = c.card ? themeOf(c.card.color) : null;
              return (
                <button
                  key={c.id}
                  onClick={() => select(c)}
                  className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ${theme ? theme.soft : 'bg-ink/5'}`}>
                    {c.card ? c.card.icon : c.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{c.name}</p>
                    <p className="truncate text-xs font-medium text-ink/50">
                      {c.phone} · {c.code}
                    </p>
                  </div>
                  {c.card && (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${theme.chip}`}>
                      {c.card.stamps}/{c.card.stamps_required}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {!selected && !q.trim() && (
        <EmptyState
          icon="☝️"
          title="Buscá un cliente para comenzar"
          hint="El cliente suma un sello por cada compra válida."
        />
      )}

      {/* Selected customer */}
      {selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold">{selected.name}</p>
              <p className="text-xs font-semibold text-ink/50">
                {selected.phone} · {selected.code}
              </p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setOk('');
                setError('');
              }}
              className="rounded-2xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5"
            >
              Cambiar cliente
            </button>
          </div>

          {activeCards.map((card) => (
            <div key={card.id} className="space-y-3">
              <StampCard
                name={card.template_name}
                icon={card.icon}
                color={card.color}
                stampsRequired={card.stamps_required}
                stamps={card.stamps}
                status={card.status}
                rewardName={card.reward_name}
                holder={selected.name}
              />
              {card.status === 'active' ? (
                <PrimaryButton
                  disabled={busy}
                  onClick={() => doStamp(card.id)}
                  className="w-full py-4 text-base"
                >
                  <StampIcon size={18} /> Agregar sello por compra
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  disabled={busy}
                  onClick={() => doRedeem(card.id)}
                  className="w-full !bg-gradient-to-r from-amber-400 to-orange-500 py-4 text-base !text-ink"
                >
                  <Gift size={18} /> Registrar canje: {card.reward_name}
                </PrimaryButton>
              )}
            </div>
          ))}

          <ErrorNote>{error}</ErrorNote>
          <SuccessNote>{ok}</SuccessNote>
        </div>
      )}
    </div>
  );
}
