import { Router } from 'express';
import { db, sendError } from '../db.js';
import { requireBusiness } from '../auth.js';

const router = Router();
router.use(requireBusiness);

const TEMPLATE_SELECT = `
  SELECT t.*, r.name AS reward_name, r.description AS reward_description,
    (SELECT COUNT(*) FROM cards k JOIN customers c ON c.id = k.customer_id
      WHERE k.template_id = t.id AND k.status IN ('active','reward_ready')) AS active_cards,
    (SELECT COUNT(*) FROM cards k WHERE k.template_id = t.id AND k.status = 'redeemed') AS completed_cards
  FROM card_templates t
  LEFT JOIN rewards r ON r.id = t.reward_id
`;

router.get('/', (req, res) => {
  res.json(
    db.prepare(`${TEMPLATE_SELECT} WHERE t.business_id = ? ORDER BY t.active DESC, t.created_at ASC`)
      .all(req.business.id)
  );
});

function validateBody(req, res, body) {
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
    const r = db.prepare('SELECT 1 FROM rewards WHERE id = ? AND business_id = ?')
      .get(body.reward_id, req.business.id);
    if (!r) { sendError(res, 400, 'La recompensa seleccionada no existe.'); return null; }
  }
  return { name, description, stamps, color, icon, reward_id: body.reward_id || null };
}

router.post('/', (req, res) => {
  const v = validateBody(req, res, req.body);
  if (!v) return;
  const id = db.prepare(
    'INSERT INTO card_templates (business_id, name, description, stamps_required, reward_id, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.business.id, v.name, v.description, v.stamps, v.reward_id, v.color, v.icon).lastInsertRowid;
  res.status(201).json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(id));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM card_templates WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.business.id);
  if (!existing) return sendError(res, 404, 'Tarjeta no encontrada.');

  if (typeof req.body.active === 'boolean' && Object.keys(req.body).length === 1) {
    db.prepare('UPDATE card_templates SET active = ? WHERE id = ?')
      .run(req.body.active ? 1 : 0, existing.id);
    return res.json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(existing.id));
  }

  const v = validateBody(req, res, { ...existing, ...req.body });
  if (!v) return;
  db.prepare(
    'UPDATE card_templates SET name = ?, description = ?, stamps_required = ?, reward_id = ?, color = ?, icon = ? WHERE id = ?'
  ).run(v.name, v.description, v.stamps, v.reward_id, v.color, v.icon, existing.id);
  res.json(db.prepare(`${TEMPLATE_SELECT} WHERE t.id = ?`).get(existing.id));
});

export default router;
