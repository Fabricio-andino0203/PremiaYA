import { Router } from 'express';
import { db, sendError, generateCustomerCode, checkCustomerLimit } from '../db.js';

const router = Router();

function activeBusiness(slug) {
  return db.prepare("SELECT * FROM businesses WHERE slug = ? AND status = 'active'")
    .get(String(slug || '').toLowerCase());
}

router.get('/business/:slug', (req, res) => {
  const business = activeBusiness(req.params.slug);
  if (!business) return sendError(res, 404, 'Negocio no encontrado.');
  const templates = db.prepare(`
    SELECT t.id, t.name, t.description, t.stamps_required, t.color, t.icon,
           r.name AS reward_name
    FROM card_templates t LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE t.business_id = ? AND t.active = 1 ORDER BY t.created_at ASC
  `).all(business.id);
  res.json({
    name: business.name,
    slug: business.slug,
    icon: business.icon,
    logo: business.logo,
    theme: business.theme,
    templates,
  });
});

router.post('/register', (req, res) => {
  const business = activeBusiness(req.body.slug);
  if (!business) return sendError(res, 404, 'Negocio no encontrado.');

  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  let templateId = req.body.template_id ? Number(req.body.template_id) : null;

  if (name.length < 2) return sendError(res, 400, 'Ingresá tu nombre completo.');
  if (!/^[\d\s+\-()]{7,20}$/.test(phone)) return sendError(res, 400, 'Ingresá un número de teléfono válido.');

  const limitError = checkCustomerLimit(business.id);
  if (limitError) return sendError(res, 403, 'El registro no está disponible por ahora. Consultá en el local.');

  const existing = db.prepare('SELECT code FROM customers WHERE business_id = ? AND phone = ?')
    .get(business.id, phone);
  if (existing) {
    // Ya registrado: devolvemos su tarjeta en lugar de error (UX del QR en mostrador)
    return res.json({ code: existing.code, already_registered: true });
  }

  if (templateId) {
    const t = db.prepare('SELECT 1 FROM card_templates WHERE id = ? AND business_id = ? AND active = 1')
      .get(templateId, business.id);
    if (!t) return sendError(res, 400, 'La tarjeta seleccionada no está disponible.');
  } else {
    const t = db.prepare(
      'SELECT id FROM card_templates WHERE business_id = ? AND active = 1 ORDER BY created_at ASC LIMIT 1'
    ).get(business.id);
    if (!t) return sendError(res, 409, 'Este negocio todavía no tiene tarjetas activas.');
    templateId = t.id;
  }

  const create = db.transaction(() => {
    const code = generateCustomerCode();
    const customerId = db.prepare(
      'INSERT INTO customers (business_id, code, name, phone) VALUES (?, ?, ?, ?)'
    ).run(business.id, code, name, phone).lastInsertRowid;
    db.prepare('INSERT INTO cards (customer_id, template_id) VALUES (?, ?)').run(customerId, templateId);
    db.prepare("INSERT INTO movements (customer_id, type, detail) VALUES (?, 'register', 'Cliente registrado (auto-registro QR)')")
      .run(customerId);
    return code;
  });

  res.status(201).json({ code: create(), already_registered: false });
});

export default router;
