import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const totalCustomers = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
  const totalStamps = db.prepare("SELECT COUNT(*) AS n FROM movements WHERE type = 'stamp'").get().n;
  const pendingRewards = db.prepare("SELECT COUNT(*) AS n FROM cards WHERE status = 'reward_ready'").get().n;
  const redeemedRewards = db.prepare("SELECT COUNT(*) AS n FROM movements WHERE type = 'redeem'").get().n;

  const totalCards = db.prepare('SELECT COUNT(*) AS n FROM cards').get().n;
  const completedCards = db.prepare("SELECT COUNT(*) AS n FROM cards WHERE status IN ('reward_ready','redeemed')").get().n;

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const stampsThisWeek = db.prepare(
    "SELECT COUNT(*) AS n FROM movements WHERE type = 'stamp' AND created_at >= ?"
  ).get(weekAgo).n;
  const newCustomersThisWeek = db.prepare(
    'SELECT COUNT(*) AS n FROM customers WHERE created_at >= ?'
  ).get(weekAgo).n;

  const recent = db.prepare(`
    SELECT m.id, m.type, m.detail, m.created_at,
           c.id AS customer_id, c.name AS customer_name
    FROM movements m
    JOIN customers c ON c.id = m.customer_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 12
  `).all();

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
