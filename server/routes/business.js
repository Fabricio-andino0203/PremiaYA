import { Router } from 'express';
import { db, sendError, businessWithPlan } from '../db.js';
import { THEME_KEYS } from '../constants.js';

const router = Router();

router.get('/me', (req, res) => {
  const business = businessWithPlan(req.business.id);
  const payments = db.prepare(`
    SELECT pay.*, p.name AS plan_name FROM payments pay
    LEFT JOIN plans p ON p.id = pay.plan_id
    WHERE pay.business_id = ? ORDER BY pay.created_at DESC LIMIT 24
  `).all(req.business.id);
  res.json({ business, payments });
});

router.patch('/me', (req, res) => {
  const b = req.business;
  const name = req.body.name !== undefined ? String(req.body.name).trim() : b.name;
  const icon = req.body.icon !== undefined ? String(req.body.icon) : b.icon;
  const theme = req.body.theme !== undefined ? String(req.body.theme) : b.theme;
  const cc = req.body.whatsapp_country_code !== undefined
    ? String(req.body.whatsapp_country_code).replace(/\D/g, '')
    : b.whatsapp_country_code;

  if (name.length < 2) return sendError(res, 400, 'Ingresá el nombre del negocio.');
  if (!THEME_KEYS.includes(theme)) return sendError(res, 400, 'Tema inválido.');
  if (cc.length < 1 || cc.length > 4) {
    return sendError(res, 400, 'El código de país de WhatsApp debe tener de 1 a 4 dígitos.');
  }

  let logo = b.logo;
  if (req.body.logo !== undefined) {
    if (!req.body.logo) {
      logo = null;
    } else if (
      typeof req.body.logo === 'string' &&
      /^data:image\/(png|jpeg|webp);base64,/.test(req.body.logo)
    ) {
      if (req.body.logo.length > 400000) {
        return sendError(res, 400, 'El logo es demasiado pesado. Usá una imagen más pequeña.');
      }
      logo = req.body.logo;
    } else {
      return sendError(res, 400, 'Formato de logo inválido (PNG, JPG o WebP).');
    }
  }

  db.prepare('UPDATE businesses SET name = ?, icon = ?, theme = ?, whatsapp_country_code = ?, logo = ? WHERE id = ?')
    .run(name, icon, theme, cc, logo, b.id);
  res.json({ business: businessWithPlan(b.id) });
});

export default router;
