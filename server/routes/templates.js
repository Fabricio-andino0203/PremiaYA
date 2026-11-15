import { Router } from 'express';
import { db, sendError } from '../db.js';

const router = Router();

const TEMPLATE_SELECT = `
  SELECT t.*, r.name AS reward_name, r.description AS reward_description,
    (SELECT COUNT(*) FROM cards k WHERE k.template_id = t.id AND k.status IN ('active','reward_ready')) AS active_cards,
    (SELECT COUNT(*) FROM cards k WHERE k.template_id = t.id AND k.status = 'redeemed') AS completed_cards
  FROM card_templates t
  LEFT JOIN rewards r ON r.id = t.reward_id
`;

router.get('/', (_req, res) => {
  res.json(db.prepare(`${TEMPLATE_SELECT} ORDER BY t.active DESC, t.created_at ASC`).all());
});

function validateBody(res, body) {
  const name = (body.name || '').trim();
  const description = (body.description || '').trim();
  const stamps = Number(body.stamps_required);
  const color = body.color || 'mango';
  const icon = body.icon || '🥤';

  if (name.length < 2) { sendError(res, 400, 'Ingresá un nombre para la tarjeta.'); return null; }
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 20) {
    sendError(res, 400, 'La cantidad de sellos debe ser un número entre 1 y 20.'); return null;
  }
  if (body.reward_id) {
    const r = db.prepare('SELECT 1 FROM rewards WHERE id = ?').get(body.reward_id);
    if (!r) { sendError(res, 400, 'La recompensa seleccionada no existe.'); return null; }
  }
  return { name, description, stamps, color, icon, reward_id: body.reward_id || null };
}

router.post('/', (req, res) => {
  const v = validateBody(res, req.body);
  if (!v) return;
  const id = db.prepare(
    'INSERT INTO card_templates (name, description, stamps_required, reward_id, color, icon) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(v.name, v.description, v.stamps, v.reward_id, v.color, v.icon).lastInsertRowid;
  res.status(201).json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(id));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM card_templates WHERE id = ?').get(req.params.id);
  if (!existing) return sendError(res, 404, 'Tarjeta no encontrada.');

  if (typeof req.body.active === 'boolean' && Object.keys(req.body).length === 1) {
    db.prepare('UPDATE card_templates SET active = ? WHERE id = ?')
      .run(req.body.active ? 1 : 0, existing.id);
    return res.json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(existing.id));
  }

  const v = validateBody(res, { ...existing, ...req.body });
  if (!v) return;
  db.prepare(
    'UPDATE card_templates SET name = ?, description = ?, stamps_required = ?, reward_id = ?, color = ?, icon = ? WHERE id = ?'
  ).run(v.name, v.description, v.stamps, v.reward_id, v.color, v.icon, existing.id);
  res.json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(existing.id));
});

export default router;
