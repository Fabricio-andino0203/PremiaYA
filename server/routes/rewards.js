import { Router } from 'express';
import { db, sendError } from '../db.js';
import { requireBusiness } from '../auth.js';

const router = Router();
router.use(requireBusiness);

router.get('/', (req, res) => {
  const bid = req.business.id;

  const rewards = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM card_templates t WHERE t.reward_id = r.id AND t.active = 1) AS linked_templates,
      (SELECT COUNT(*) FROM movements m JOIN cards k ON k.id = m.card_id
        JOIN card_templates t ON t.id = k.template_id
        WHERE m.type = 'redeem' AND t.reward_id = r.id) AS times_redeemed
    FROM rewards r WHERE r.business_id = ? ORDER BY r.created_at ASC
  `).all(bid);

  const pending = db.prepare(`
    SELECT k.id AS card_id, k.completed_at, c.id AS customer_id, c.name AS customer_name, c.code,
           t.name AS template_name, t.color, t.icon, t.stamps_required,
           r.name AS reward_name
    FROM cards k
    JOIN customers c ON c.id = k.customer_id
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.status = 'reward_ready' AND c.business_id = ?
    ORDER BY k.completed_at ASC
  `).all(bid);

  const redeemed = db.prepare(`
    SELECT m.id, m.detail, m.created_at, c.name AS customer_name, c.id AS customer_id
    FROM movements m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.type = 'redeem' AND c.business_id = ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 50
  `).all(bid);

  res.json({ rewards, pending, redeemed });
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const stamps = Number(req.body.stamps_required);

  if (name.length < 2) return sendError(res, 400, 'Ingresá un nombre para la recompensa.');
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 20) {
    return sendError(res, 400, 'La cantidad de sellos debe ser un número entre 1 y 20.');
  }

  const id = db.prepare(
    'INSERT INTO rewards (business_id, name, description, stamps_required) VALUES (?, ?, ?, ?)'
  ).run(req.business.id, name, description, stamps).lastInsertRowid;
  res.status(201).json(db.prepare('SELECT * FROM rewards WHERE id = ?').get(id));
});

export default router;
