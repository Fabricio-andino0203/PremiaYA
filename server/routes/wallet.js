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
  if (!customer) return { customer: null, card: null, business: null };
  const business = db.prepare('SELECT name, slug, icon, theme FROM businesses WHERE id = ?')
    .get(customer.business_id);
  const card = db.prepare(`
    SELECT k.*, t.name AS template_name, t.stamps_required, t.color, t.icon,
           r.name AS reward_name
    FROM cards k
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.customer_id = ? AND k.status IN ('active','reward_ready')
    ORDER BY k.created_at ASC LIMIT 1
  `).get(customer.id);
  return { customer, card, business };
}

router.get('/:code/passes', (req, res) => {
  const { customer } = customerWithCard(req.params.code);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  res.json({ status: walletStatus(), passes: getPasses(customer.id) });
});

// Descarga directa del .pkpass firmado (modo oficial)
router.get('/:code/apple.pkpass', (req, res) => {
  const { customer, card, business } = customerWithCard(req.params.code);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  if (!card) return sendError(res, 409, 'El cliente no tiene una tarjeta activa.');
  const record = registerPass(customer, 'apple', card);
  try {
    const buf = generateSignedPass(buildPassData(customer, card, business), record.serial);
    res.set('Content-Type', 'application/vnd.apple.pkpass');
    res.set('Content-Disposition', `attachment; filename="${record.serial}.pkpass"`);
    res.send(buf);
  } catch (e) {
    if (e.code === 'WALLET_NOT_CONFIGURED') return sendError(res, 409, e.message);
    console.error('Error generando .pkpass:', e);
    sendError(res, 500, 'No se pudo generar el pase de Apple Wallet.');
  }
});

router.post('/:code/add', (req, res) => {
  const platform = req.body.platform;
  if (!['apple', 'google'].includes(platform)) {
    return sendError(res, 400, 'Plataforma inválida.');
  }

  const { customer, card, business } = customerWithCard(req.params.code);
  if (!customer) return sendError(res, 404, 'Cliente no encontrado.');
  if (!card) return sendError(res, 409, 'El cliente no tiene una tarjeta activa.');

  const status = walletStatus();
  const record = registerPass(customer, platform, card);
  const passData = buildPassData(customer, card, business);

  // Modo oficial
  if (platform === 'apple' && status.apple.configured) {
    return res.json({
      demo: false,
      download_url: `/api/wallet/${encodeURIComponent(customer.code)}/apple.pkpass`,
    });
  }
  if (platform === 'google' && status.google.configured) {
    try {
      return res.json({ demo: false, save_url: buildSaveUrl(passData, record.serial) });
    } catch (e) {
      console.error('Error firmando JWT de Google Wallet:', e);
      return sendError(res, 500, 'No se pudo generar el enlace de Google Wallet.');
    }
  }

  // Modo DEMO claramente identificado
  res.json({
    demo: true,
    platform,
    record,
    pass: passData,
    preview:
      platform === 'apple'
        ? buildPassJson(passData, record.serial)
        : buildLoyaltyObject(passData, record.serial),
    message: record.already_added
      ? 'Esta tarjeta ya estaba agregada (demo). Se muestra su estado actual.'
      : 'Tarjeta agregada en modo DEMO. Con los certificados oficiales se instalará en la billetera real.',
  });
});

export default router;
