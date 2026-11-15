import { Router } from 'express';
import { db, sendError } from '../db.js';
import { notifyWalletUpdate } from '../wallet/index.js';
import { requireBusiness } from '../auth.js';

const router = Router();

router.use(requireBusiness);

const STAMP_COOLDOWN_SECONDS = Number(process.env.STAMP_COOLDOWN_SECONDS || 60);

function getCardFull(id, businessId) {
  return db.prepare(`
    SELECT k.*, t.name AS template_name, t.stamps_required, t.color, t.icon,
           r.name AS reward_name, r.description AS reward_description
    FROM cards k
    JOIN customers c ON c.id = k.customer_id
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.id = ? AND c.business_id = ?
  `).get(id, businessId);
}

router.post('/:id/stamp', (req, res) => {
  const card = getCardFull(req.params.id, req.business.id);
  if (!card) return sendError(res, 404, 'Tarjeta no encontrada.');

  if (card.status === 'reward_ready') {
    return sendError(res, 409, 'La tarjeta ya está completa. Registrá el canje de la recompensa.');
  }
  if (card.status === 'redeemed') {
    return sendError(res, 409, 'Esta tarjeta ya fue canjeada.');
  }

  const lastStamp = db.prepare(
    "SELECT created_at FROM movements WHERE card_id = ? AND type = 'stamp' ORDER BY created_at DESC, id DESC LIMIT 1"
  ).get(card.id);
  if (lastStamp) {
    const elapsed = (Date.now() - Date.parse(lastStamp.created_at)) / 1000;
    if (elapsed >= 0 && elapsed < STAMP_COOLDOWN_SECONDS) {
      const wait = Math.ceil(STAMP_COOLDOWN_SECONDS - elapsed);
      const secs = Math.floor(elapsed);
      return sendError(res, 409,
        `Sello duplicado: se registró otro sello hace ${secs} segundo${secs === 1 ? '' : 's'}. Esperá ${wait} s e intentá de nuevo.`);
    }
  }

  const stamp = db.transaction(() => {
    const newStamps = card.stamps + 1;
    const completed = newStamps >= card.stamps_required;
    db.prepare(`
      UPDATE cards SET stamps = ?,
        status = CASE WHEN ? THEN 'reward_ready' ELSE status END,
        completed_at = CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE completed_at END
      WHERE id = ?
    `).run(newStamps, completed ? 1 : 0, completed ? 1 : 0, card.id);

    const detail = `Sello ${newStamps}/${card.stamps_required} — ${card.template_name}` +
      (completed ? ' · ¡Tarjeta completada! 🎉' : '');
    db.prepare("INSERT INTO movements (customer_id, card_id, type, detail) VALUES (?, ?, 'stamp', ?)")
      .run(card.customer_id, card.id, detail);
    return completed;
  });

  const completed = stamp();
  notifyWalletUpdate(card.customer_id);
  res.json({
    card: getCardFull(card.id, req.business.id),
    reward_ready: completed,
    message: completed
      ? `¡Tarjeta completa! Recompensa desbloqueada: ${card.reward_name || 'premio'}.`
      : 'Sello registrado correctamente.',
  });
});

router.post('/:id/redeem', (req, res) => {
  const card = getCardFull(req.params.id, req.business.id);
  if (!card) return sendError(res, 404, 'Tarjeta no encontrada.');

  if (card.status === 'active') {
    const missing = card.stamps_required - card.stamps;
    return sendError(res, 409,
      `La recompensa todavía no está desbloqueada: faltan ${missing} sello${missing === 1 ? '' : 's'}.`);
  }
  if (card.status === 'redeemed') {
    return sendError(res, 409, 'Esta recompensa ya fue canjeada.');
  }

  const redeem = db.transaction(() => {
    db.prepare("UPDATE cards SET status = 'redeemed', redeemed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
      .run(card.id);
    db.prepare("INSERT INTO movements (customer_id, card_id, type, detail) VALUES (?, ?, 'redeem', ?)")
      .run(card.customer_id, card.id, `Canje: ${card.reward_name || 'recompensa'} — nueva tarjeta iniciada`);
    return db.prepare('INSERT INTO cards (customer_id, template_id) VALUES (?, ?)')
      .run(card.customer_id, card.template_id).lastInsertRowid;
  });

  const newCardId = redeem();
  notifyWalletUpdate(card.customer_id);
  res.json({
    redeemed_card: getCardFull(card.id, req.business.id),
    new_card: getCardFull(newCardId, req.business.id),
    message: `Canje registrado: ${card.reward_name || 'recompensa'}. Se inició una nueva tarjeta.`,
  });
});

export default router;
