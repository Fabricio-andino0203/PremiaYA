import { Router } from 'express';
import { db, generateCustomerCode, sendError } from '../db.js';

const router = Router();

const ACTIVE_CARD_JOIN = `
  LEFT JOIN cards k ON k.id = (
    SELECT id FROM cards
    WHERE customer_id = c.id AND status IN ('active','reward_ready')
    ORDER BY created_at ASC LIMIT 1
  )
  LEFT JOIN card_templates t ON t.id = k.template_id
`;

const CUSTOMER_SELECT = `
  SELECT c.id, c.code, c.name, c.phone, c.created_at,
         k.id AS card_id, k.stamps, k.status AS card_status,
         t.name AS template_name, t.stamps_required, t.color, t.icon
  FROM customers c
  ${ACTIVE_CARD_JOIN}
`;

function shapeCustomerRow(row) {
  const { card_id, stamps, card_status, template_name, stamps_required, color, icon, ...customer } = row;
  return {
    ...customer,
    card: card_id
      ? { id: card_id, stamps, status: card_status, template_name, stamps_required, color, icon }
      : null,
  };
}

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      `${CUSTOMER_SELECT} WHERE c.name LIKE ? OR c.phone LIKE ? OR c.code LIKE ? ORDER BY c.name ASC`
    ).all(like, like, like);
  } else {
    rows = db.prepare(`${CUSTOMER_SELECT} ORDER BY c.created_at DESC`).all();
  }
  res.json(rows.map(shapeCustomerRow));
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  let templateId = req.body.template_id;

  if (name.length < 2) return sendError(res, 400, 'Ingresá el nombre completo del cliente.');
  if (!/^[\d\s+\-()]{7,20}$/.test(phone)) return sendError(res, 400, 'Ingresá un número de teléfono válido.');

  if (db.prepare('SELECT 1 FROM customers WHERE phone = ?').get(phone)) {
    return sendError(res, 409, 'Ya existe un cliente registrado con ese teléfono.');
  }

  if (templateId) {
    const t = db.prepare('SELECT id FROM card_templates WHERE id = ? AND active = 1').get(templateId);
    if (!t) return sendError(res, 400, 'La tarjeta seleccionada no está disponible.');
  } else {
    const t = db.prepare('SELECT id FROM card_templates WHERE active = 1 ORDER BY created_at ASC LIMIT 1').get();
    if (!t) return sendError(res, 400, 'No hay tarjetas activas. Creá una tarjeta primero.');
    templateId = t.id;
  }

  const create = db.transaction(() => {
    const code = generateCustomerCode();
    const customerId = db.prepare('INSERT INTO customers (code, name, phone) VALUES (?, ?, ?)')
      .run(code, name, phone).lastInsertRowid;
    db.prepare('INSERT INTO cards (customer_id, template_id) VALUES (?, ?)').run(customerId, templateId);
    db.prepare("INSERT INTO movements (customer_id, type, detail) VALUES (?, 'register', 'Cliente registrado')")
      .run(customerId);
    return customerId;
  });

  const customerId = create();
  const row = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(customerId);
  res.status(201).json(shapeCustomerRow(row));
});

function fullProfile(customer) {
  const cards = db.prepare(`
    SELECT k.*, t.name AS template_name, t.description AS template_description,
           t.stamps_required, t.color, t.icon,
           r.name AS reward_name, r.description AS reward_description
    FROM cards k
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.customer_id = ?
    ORDER BY k.created_at DESC
  `).all(customer.id);

  const movements = db.prepare(
    'SELECT * FROM movements WHERE customer_id = ? ORDER BY created_at DESC, id DESC LIMIT 100'
  ).all(customer.id);

  return { ...customer, cards, movements };
}

router.get('/by-code/:code', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE code = ? COLLATE NOCASE')
    .get(req.params.code.trim());
  if (!customer) return sendError(res, 404, 'No encontramos una tarjeta con ese código.');

  const templates = db.prepare(`
    SELECT t.id, t.name, t.description, t.stamps_required, t.color, t.icon,
           r.name AS reward_name, r.description AS reward_description
    FROM card_templates t
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE t.active = 1
    ORDER BY t.created_at ASC
  `).all();

  res.json({ ...fullProfile(customer), available_rewards: templates });
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  res.json(fullProfile(customer));
});

export default router;
