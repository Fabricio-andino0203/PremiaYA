import { Router } from 'express';
import { db, sendError } from '../db.js';
import { hashPassword } from '../auth.js';

const router = Router();

const BUSINESS_SELECT = `
  SELECT b.*, p.name AS plan_name, p.price_monthly AS plan_price, p.max_customers AS plan_max_customers,
    (SELECT COUNT(*) FROM customers c WHERE c.business_id = b.id) AS customer_count,
    (SELECT COUNT(*) FROM movements m JOIN customers c ON c.id = m.customer_id
      WHERE c.business_id = b.id AND m.type = 'stamp') AS stamp_count,
    (SELECT u.email FROM users u WHERE u.business_id = b.id AND u.role = 'owner' LIMIT 1) AS owner_email
  FROM businesses b
  LEFT JOIN plans p ON p.id = b.plan_id
`;

router.get('/overview', (_req, res) => {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  res.json({
    totalBusinesses: db.prepare('SELECT COUNT(*) AS n FROM businesses').get().n,
    activeBusinesses: db.prepare("SELECT COUNT(*) AS n FROM businesses WHERE status = 'active'").get().n,
    totalCustomers: db.prepare('SELECT COUNT(*) AS n FROM customers').get().n,
    totalStamps: db.prepare("SELECT COUNT(*) AS n FROM movements WHERE type = 'stamp'").get().n,
    revenueThisMonth: db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE created_at >= ?')
      .get(monthStart.toISOString()).s,
    revenueTotal: db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments').get().s,
    businesses: db.prepare(`${BUSINESS_SELECT} ORDER BY b.created_at DESC`).all(),
  });
});

router.get('/businesses', (_req, res) => {
  res.json(db.prepare(`${BUSINESS_SELECT} ORDER BY b.created_at DESC`).all());
});

router.post('/businesses', (req, res) => {
  const name = (req.body.name || '').trim();
  const slug = (req.body.slug || '').trim().toLowerCase();
  const icon = req.body.icon || '🎁';
  const theme = req.body.theme || 'berry';
  const planId = Number(req.body.plan_id);
  const ownerName = (req.body.owner_name || '').trim();
  const ownerEmail = (req.body.owner_email || '').trim().toLowerCase();
  const ownerPassword = req.body.owner_password || '';

  if (name.length < 2) return sendError(res, 400, 'Ingresá el nombre del negocio.');
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
    return sendError(res, 400, 'El identificador (slug) debe tener 3-30 caracteres: letras minúsculas, números o guiones.');
  }
  if (!db.prepare('SELECT 1 FROM plans WHERE id = ?').get(planId)) {
    return sendError(res, 400, 'Elegí un plan válido.');
  }
  if (ownerName.length < 2) return sendError(res, 400, 'Ingresá el nombre del dueño.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) return sendError(res, 400, 'Ingresá un correo válido.');
  if (ownerPassword.length < 8) return sendError(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
  if (db.prepare('SELECT 1 FROM businesses WHERE slug = ?').get(slug)) {
    return sendError(res, 409, 'Ya existe un negocio con ese identificador.');
  }
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(ownerEmail)) {
    return sendError(res, 409, 'Ya existe un usuario con ese correo.');
  }

  const create = db.transaction(() => {
    const businessId = db.prepare(
      'INSERT INTO businesses (slug, name, icon, theme, plan_id) VALUES (?, ?, ?, ?, ?)'
    ).run(slug, name, icon, theme, planId).lastInsertRowid;

    db.prepare(
      "INSERT INTO users (business_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'owner')"
    ).run(businessId, ownerName, ownerEmail, hashPassword(ownerPassword));

    // Tarjeta inicial para que el negocio arranque funcionando
    const rewardId = db.prepare(
      "INSERT INTO rewards (business_id, name, description, stamps_required) VALUES (?, 'Premio de la casa', 'Definí tu recompensa en el panel', 8)"
    ).run(businessId).lastInsertRowid;
    db.prepare(
      "INSERT INTO card_templates (business_id, name, description, stamps_required, reward_id, color, icon) VALUES (?, 'Tarjeta de sellos', 'Juntá 8 sellos y llevate tu premio', 8, ?, 'berry', ?)"
    ).run(businessId, rewardId, icon);

    return businessId;
  });

  const businessId = create();
  res.status(201).json(db.prepare(`${BUSINESS_SELECT} WHERE b.id = ?`).get(businessId));
});

router.patch('/businesses/:id', (req, res) => {
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
  if (!business) return sendError(res, 404, 'Negocio no encontrado.');

  if (req.body.status && !['active', 'suspended'].includes(req.body.status)) {
    return sendError(res, 400, 'Estado inválido.');
  }
  if (req.body.plan_id && !db.prepare('SELECT 1 FROM plans WHERE id = ?').get(req.body.plan_id)) {
    return sendError(res, 400, 'Plan inválido.');
  }

  db.prepare('UPDATE businesses SET status = ?, plan_id = ? WHERE id = ?').run(
    req.body.status || business.status,
    req.body.plan_id || business.plan_id,
    business.id
  );
  res.json(db.prepare(`${BUSINESS_SELECT} WHERE b.id = ?`).get(business.id));
});

router.get('/plans', (_req, res) => {
  res.json(db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM businesses b WHERE b.plan_id = p.id) AS business_count
    FROM plans p ORDER BY p.price_monthly ASC
  `).all());
});

function validPlan(res, body) {
  const name = (body.name || '').trim();
  const price = Number(body.price_monthly);
  const max = body.max_customers === null || body.max_customers === '' || body.max_customers === undefined
    ? null
    : Number(body.max_customers);
  if (name.length < 2) { sendError(res, 400, 'Ingresá el nombre del plan.'); return null; }
  if (!Number.isFinite(price) || price < 0) { sendError(res, 400, 'Precio inválido.'); return null; }
  if (max !== null && (!Number.isInteger(max) || max < 1)) {
    sendError(res, 400, 'El límite de clientes debe ser un entero positivo o vacío (ilimitado).');
    return null;
  }
  return { name, description: (body.description || '').trim(), price, max };
}

router.post('/plans', (req, res) => {
  const v = validPlan(res, req.body);
  if (!v) return;
  const id = db.prepare(
    'INSERT INTO plans (name, description, price_monthly, max_customers) VALUES (?, ?, ?, ?)'
  ).run(v.name, v.description, v.price, v.max).lastInsertRowid;
  res.status(201).json(db.prepare('SELECT * FROM plans WHERE id = ?').get(id));
});

router.patch('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) return sendError(res, 404, 'Plan no encontrado.');
  const v = validPlan(res, { ...plan, max_customers: plan.max_customers, ...req.body });
  if (!v) return;
  db.prepare('UPDATE plans SET name = ?, description = ?, price_monthly = ?, max_customers = ? WHERE id = ?')
    .run(v.name, v.description, v.price, v.max, plan.id);
  res.json(db.prepare('SELECT * FROM plans WHERE id = ?').get(plan.id));
});

router.get('/payments', (_req, res) => {
  res.json(db.prepare(`
    SELECT pay.*, b.name AS business_name, b.icon AS business_icon, p.name AS plan_name
    FROM payments pay
    JOIN businesses b ON b.id = pay.business_id
    LEFT JOIN plans p ON p.id = pay.plan_id
    ORDER BY pay.created_at DESC LIMIT 200
  `).all());
});

router.post('/payments', (req, res) => {
  const businessId = Number(req.body.business_id);
  const amount = Number(req.body.amount);
  if (!db.prepare('SELECT 1 FROM businesses WHERE id = ?').get(businessId)) {
    return sendError(res, 400, 'Negocio inválido.');
  }
  if (!Number.isFinite(amount) || amount <= 0) return sendError(res, 400, 'Monto inválido.');

  const id = db.prepare(
    'INSERT INTO payments (business_id, plan_id, amount, method, period_label, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    businessId,
    req.body.plan_id || null,
    amount,
    (req.body.method || 'manual').trim(),
    (req.body.period_label || '').trim(),
    (req.body.note || '').trim()
  ).lastInsertRowid;

  res.status(201).json(db.prepare(`
    SELECT pay.*, b.name AS business_name, p.name AS plan_name
    FROM payments pay JOIN businesses b ON b.id = pay.business_id
    LEFT JOIN plans p ON p.id = pay.plan_id WHERE pay.id = ?
  `).get(id));
});

export default router;
