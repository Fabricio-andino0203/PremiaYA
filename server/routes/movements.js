import { Router } from 'express';
import { db } from '../db.js';
import { requireBusiness } from '../auth.js';

const router = Router();
router.use(requireBusiness);

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const type = (req.query.type || '').trim();
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const where = ['c.business_id = ?'];
  const params = [req.business.id];
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
    WHERE ${where.join(' AND ')}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `).all(...params, limit);

  res.json(rows);
});

export default router;
