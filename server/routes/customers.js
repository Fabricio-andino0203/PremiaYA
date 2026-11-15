import { Router } from 'express';
import { db, generateCustomerCode, sendError, checkCustomerLimit } from '../db.js';
import { requireBusiness } from '../auth.js';

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

// ---- Público: portal del cliente ----
router.get('/by-code/:code', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE code = ? COLLATE NOCASE')
    .get(req.params.code.trim());
  if (!customer) return sendError(res, 404, 'No encontramos una tarjeta con ese código.');

  const business = db.prepare('SELECT name, slug, icon, logo, theme FROM businesses WHERE id = ?')
    .get(customer.business_id);

  const templates = db.prepare(`
    SELECT t.id, t.name, t.description, t.stamps_required, t.color, t.icon,
           r.name AS reward_name, r.description AS reward_description
    FROM card_templates t
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE t.business_id = ? AND t.active = 1
    ORDER BY t.created_at ASC
  `).all(customer.business_id);

  res.json({ ...fullProfile(customer), business, available_rewards: templates });
});

// ---- Protegido: panel del negocio ----
router.use(requireBusiness);

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      `${CUSTOMER_SELECT} WHERE c.business_id = ? AND (c.name LIKE ? OR c.phone LIKE ? OR c.code LIKE ?) ORDER BY c.name ASC`
    ).all(req.business.id, like, like, like);
  } else {
    rows = db.prepare(`${CUSTOMER_SELECT} WHERE c.business_id = ? ORDER BY c.created_at DESC`)
      .all(req.business.id);
  }
  res.json(rows.map(shapeCustomerRow));
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  let templateId = req.body.template_id;

  if (name.length < 2) return sendError(res, 400, 'Ingresá el nombre completo del cliente.');
  if (!/^[\d\s+\-()]{7,20}$/.test(phone)) return sendError(res, 400, 'Ingresá un número de teléfono válido.');

  const limitError = checkCustomerLimit(req.business.id);
  if (limitError) return sendError(res, 403, limitError);

  if (db.prepare('SELECT 1 FROM customers WHERE business_id = ? AND phone = ?').get(req.business.id, phone)) {
    return sendError(res, 409, 'Ya existe un cliente registrado con ese teléfono.');
  }

  if (templateId) {
    const t = db.prepare('SELECT id FROM card_templates WHERE id = ? AND business_id = ? AND active = 1')
      .get(templateId, req.business.id);
    if (!t) return sendError(res, 400, 'La tarjeta seleccionada no está disponible.');
  } else {
    const t = db.prepare(
      'SELECT id FROM card_templates WHERE business_id = ? AND active = 1 ORDER BY created_at ASC LIMIT 1'
    ).get(req.business.id);
    if (!t) return sendError(res, 400, 'No hay tarjetas activas. Creá una tarjeta primero.');
    templateId = t.id;
  }

  const create = db.transaction(() => {
    const code = generateCustomerCode();
    const customerId = db.prepare('INSERT INTO customers (business_id, code, name, phone) VALUES (?, ?, ?, ?)')
      .run(req.business.id, code, name, phone).lastInsertRowid;
    db.prepare('INSERT INTO cards (customer_id, template_id) VALUES (?, ?)').run(customerId, templateId);
    db.prepare("INSERT INTO movements (customer_id, type, detail) VALUES (?, 'register', 'Cliente registrado')")
      .run(customerId);
    return customerId;
  });

  const customerId = create();
  const row = db.prepare(`${CUSTOMER_SELECT} WHERE c.id = ?`).get(customerId);
  res.status(201).json(shapeCustomerRow(row));
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.business.id);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  res.json(fullProfile(customer));
});

export default router;
