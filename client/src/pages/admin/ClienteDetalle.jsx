import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Stamp as StampIcon, Gift } from 'lucide-react';
import { api } from '../../lib/api.js';
import StampCard from '../../components/StampCard.jsx';
import Confetti from '../../components/Confetti.jsx';
import {
  Card, PrimaryButton, SecondaryButton, ErrorNote, SuccessNote, MovementRow, EmptyState,
} from '../../components/ui.jsx';
import { formatDate } from '../../lib/theme.js';

export default function ClienteDetalle() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionOk, setActionOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);

  const load = () =>
    api.get(`/api/customers/${id}`).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!data) return <p className="animate-pulse text-sm text-ink/40">Cargando…</p>;

  const activeCards = data.cards.filter((c) => c.status !== 'redeemed');
  const pastCards = data.cards.filter((c) => c.status === 'redeemed');

  const doStamp = async (cardId) => {
    setBusy(true);
    setActionError('');
    setActionOk('');
    try {
      const res = await api.post(`/api/cards/${cardId}/stamp`);
      setActionOk(res.message);
      if (res.reward_ready) setBurst(Date.now());
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doRedeem = async (cardId) => {
    setBusy(true);
    setActionError('');
    setActionOk('');
    try {
      const res = await api.post(`/api/cards/${cardId}/redeem`);
      setActionOk(res.message);
      setBurst(Date.now());
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <Confetti burst={burst} />
      <Link
        to="/admin/clientes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink/50 hover:text-ink"
      >
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{data.name}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {data.phone} · Código <span className="font-bold">{data.code}</span> · Cliente desde{' '}
            {formatDate(data.created_at)}
          </p>
        </div>
        <a
          href={`/c/${data.code}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-bold text-ink/70 transition hover:bg-ink/5"
        >
          <ExternalLink size={15} /> Ver portal del cliente
        </a>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {activeCards.length === 0 ? (
            <EmptyState icon="💳" title="Sin tarjeta activa" />
          ) : (
            activeCards.map((card) => (
              <div key={card.id} className="space-y-3">
                <StampCard
                  name={card.template_name}
                  icon={card.icon}
                  color={card.color}
                  stampsRequired={card.stamps_required}
                  stamps={card.stamps}
                  status={card.status}
                  rewardName={card.reward_name}
                  holder={data.name}
                />
                <div className="flex gap-2.5">
                  {card.status === 'active' && (
                    <PrimaryButton disabled={busy} onClick={() => doStamp(card.id)} className="flex-1">
                      <StampIcon size={16} /> Agregar sello
                    </PrimaryButton>
                  )}
                  {card.status === 'reward_ready' && (
                    <PrimaryButton
                      disabled={busy}
                      onClick={() => doRedeem(card.id)}
                      className="flex-1 !bg-gradient-to-r from-amber-400 to-orange-500 !text-ink"
                    >
                      <Gift size={16} /> Registrar canje
                    </PrimaryButton>
                  )}
                </div>
              </div>
            ))
          )}
          <ErrorNote>{actionError}</ErrorNote>
          <SuccessNote>{actionOk}</SuccessNote>

          {pastCards.length > 0 && (
            <Card>
              <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
                Tarjetas anteriores
              </h2>
              <div className="divide-y divide-ink/5">
                {pastCards.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-bold">
                      {c.icon} {c.template_name}
                    </span>
                    <span className="text-xs font-semibold text-ink/45">
                      Canjeada el {formatDate(c.redeemed_at)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="self-start lg:col-span-2">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink/55">
            Historial
          </h2>
          {data.movements.length === 0 ? (
            <EmptyState title="Sin movimientos" />
          ) : (
            <div className="divide-y divide-ink/5">
              {data.movements.map((m) => (
                <MovementRow key={m.id} movement={m} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
