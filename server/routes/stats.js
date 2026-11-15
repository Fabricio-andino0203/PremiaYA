import { Router } from 'express';
import { db } from '../db.js';
import { requireBusiness } from '../auth.js';

const router = Router();

// Healthcheck público (lo usa Railway)
router.get('/health', (_req, res) => res.json({ ok: true }));

router.use(requireBusiness);

router.get('/', (req, res) => {
  const bid = req.business.id;

  const totalCustomers = db.prepare('SELECT COUNT(*) AS n FROM customers WHERE business_id = ?').get(bid).n;
  const totalStamps = db.prepare(`
    SELECT COUNT(*) AS n FROM movements m JOIN customers c ON c.id = m.customer_id
    WHERE m.type = 'stamp' AND c.business_id = ?
  `).get(bid).n;
  const pendingRewards = db.prepare(`
    SELECT COUNT(*) AS n FROM cards k JOIN customers c ON c.id = k.customer_id
    WHERE k.status = 'reward_ready' AND c.business_id = ?
  `).get(bid).n;
  const redeemedRewards = db.prepare(`
    SELECT COUNT(*) AS n FROM movements m JOIN customers c ON c.id = m.customer_id
    WHERE m.type = 'redeem' AND c.business_id = ?
  `).get(bid).n;

  const totalCards = db.prepare(`
    SELECT COUNT(*) AS n FROM cards k JOIN customers c ON c.id = k.customer_id WHERE c.business_id = ?
  `).get(bid).n;
  const completedCards = db.prepare(`
    SELECT COUNT(*) AS n FROM cards k JOIN customers c ON c.id = k.customer_id
    WHERE k.status IN ('reward_ready','redeemed') AND c.business_id = ?
  `).get(bid).n;

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const stampsThisWeek = db.prepare(`
    SELECT COUNT(*) AS n FROM movements m JOIN customers c ON c.id = m.customer_id
    WHERE m.type = 'stamp' AND m.created_at >= ? AND c.business_id = ?
  `).get(weekAgo, bid).n;
  const newCustomersThisWeek = db.prepare(
    'SELECT COUNT(*) AS n FROM customers WHERE created_at >= ? AND business_id = ?'
  ).get(weekAgo, bid).n;

  const recent = db.prepare(`
    SELECT m.id, m.type, m.detail, m.created_at,
           c.id AS customer_id, c.name AS customer_name
    FROM movements m
    JOIN customers c ON c.id = m.customer_id
    WHERE c.business_id = ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 12
  `).all(bid);

  res.json({
    totalCustomers,
    totalStamps,
    pendingRewards,
    redeemedRewards,
    completionRate: totalCards ? Math.round((completedCards / totalCards) * 100) : 0,
    stampsThisWeek,
    newCustomersThisWeek,
    recent,
  });
});

export default router;
