import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const type = (req.query.type || '').trim();
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const where = [];
  const params = [];
  if (q) {
    where.push('(c.name LIKE ? OR c.code LIKE ? OR c.phone LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (['register', 'stamp', 'redeem'].includes(type)) {
    where.push('m.type = ?');
    params.push(type);
  }

  const rows = db.prepare(`
    SELECT m.id, m.type, m.detail, m.created_at,
           c.id AS customer_id, c.name AS customer_name, c.code AS customer_code
    FROM movements m
    JOIN customers c ON c.id = m.customer_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `).all(...params, limit);

  res.json(rows);
});

export default router;
