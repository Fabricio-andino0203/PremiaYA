import { Router } from 'express';
import { db, sendError } from '../db.js';
import { walletStatus, buildPassData, registerPass, getPasses } from '../wallet/index.js';
import { buildPassJson, generateSignedPass } from '../wallet/applePass.js';
import { buildLoyaltyObject, buildSaveUrl } from '../wallet/googleWallet.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(walletStatus());
});

function customerWithCard(code) {
  const customer = db.prepare('SELECT * FROM customers WHERE code = ? COLLATE NOCASE').get(code);
  if (!customer) return { customer: null, card: null };
  const card = db.prepare(`
    SELECT k.*, t.name AS template_name, t.stamps_required, t.color, t.icon,
           r.name AS reward_name
    FROM cards k
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.customer_id = ? AND k.status IN ('active','reward_ready')
    ORDER BY k.created_at ASC LIMIT 1
  `).get(customer.id);
  return { customer, card };
}

router.get('/:code/passes', (req, res) => {
  const { customer } = customerWithCard(req.params.code);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  res.json({ status: walletStatus(), passes: getPasses(customer.id) });
});

router.post('/:code/add', (req, res) => {
  const platform = req.body.platform;
  if (!['apple', 'google'].includes(platform)) {
    return sendError(res, 400, 'Plataforma inválida.');
  }

  const { customer, card } = customerWithCard(req.params.code);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  if (!card) return sendError(res, 409, 'El cliente no tiene una tarjeta activa.');

  const status = walletStatus();
  const record = registerPass(customer, platform, card);
  const passData = buildPassData(customer, card);

  // Modo oficial: devolver el .pkpass firmado o la URL de guardado JWT.
  if (platform === 'apple' && status.apple.configured) {
    try {
      return res.json({ demo: false, pkpass: generateSignedPass(passData, record.serial) });
    } catch (e) {
      return sendError(res, 501, e.message);
    }
  }
  if (platform === 'google' && status.google.configured) {
    try {
      return res.json({ demo: false, save_url: buildSaveUrl(passData, record.serial) });
    } catch (e) {
      return sendError(res, 501, e.message);
    }
  }

  // Modo DEMO: vista previa del pase, claramente identificada como demo.
  res.json({
    demo: true,
    platform,
    record,
    pass: passData,
    preview:
      platform === 'apple'
        ? buildPassJson(passData, record.serial, null)
        : buildLoyaltyObject(passData, record.serial),
    message: record.already_added
      ? 'Esta tarjeta ya estaba agregada (demo). Se muestra su estado actual.'
      : 'Tarjeta agregada en modo DEMO. Con los certificados oficiales se instalará en la billetera real.',
  });
});

export default router;
