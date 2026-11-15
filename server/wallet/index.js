import { db } from '../db.js';
import { appleConfigured } from './applePass.js';
import { googleConfigured, patchLoyaltyObject } from './googleWallet.js';

/**
 * Estado de las integraciones oficiales. Sin credenciales configuradas el
 * sistema opera en modo DEMO claramente identificado en el portal.
 */
export function walletStatus() {
  const apple = appleConfigured();
  const google = googleConfigured();
  return {
    apple: { configured: apple, mode: apple ? 'live' : 'demo' },
    google: { configured: google, mode: google ? 'live' : 'demo' },
  };
}

/**
 * Datos del pase, neutrales a la plataforma. El pass.json de Apple (PassKit)
 * y el LoyaltyObject de Google se construyen a partir de esto.
 * El QR contiene solo el código público del cliente (sin datos sensibles).
 */
export function buildPassData(customer, card, business) {
  return {
    businessName: business?.name || 'PremiaYa',
    businessSlug: business?.slug || 'premiaya',
    customerName: customer.name,
    cardId: customer.code,
    qrValue: customer.code,
    templateName: card ? card.template_name : null,
    icon: card ? card.icon : business?.icon || '🎁',
    color: card ? card.color : business?.theme || 'berry',
    stamps: card ? card.stamps : 0,
    stampsRequired: card ? card.stamps_required : 0,
    progress: card && card.stamps_required
      ? Math.round((card.stamps / card.stamps_required) * 100)
      : 0,
    status: card ? card.status : 'active',
    rewardName: card ? card.reward_name : null,
    rewardReady: card ? card.status === 'reward_ready' : false,
  };
}

/** Serial estable por cliente y plataforma: nunca se genera un pase nuevo por compra. */
function serialFor(customer, platform) {
  return `${platform === 'apple' ? 'PK' : 'GW'}-${customer.code}`;
}

export function registerPass(customer, platform, card) {
  const serial = serialFor(customer, platform);
  const existing = db
    .prepare('SELECT * FROM wallet_passes WHERE customer_id = ? AND platform = ?')
    .get(customer.id, platform);
  if (existing) return { ...existing, already_added: true };

  db.prepare(
    'INSERT INTO wallet_passes (customer_id, platform, serial, stamps_snapshot, status_snapshot) VALUES (?, ?, ?, ?, ?)'
  ).run(customer.id, platform, serial, card ? card.stamps : 0, card ? card.status : 'active');

  return {
    ...db.prepare('SELECT * FROM wallet_passes WHERE serial = ?').get(serial),
    already_added: false,
  };
}

export function getPasses(customerId) {
  return db
    .prepare('SELECT * FROM wallet_passes WHERE customer_id = ? ORDER BY platform ASC')
    .all(customerId);
}

/**
 * Llamado tras cada sello o canje: sincroniza el snapshot local y, con
 * credenciales configuradas, actualiza el objeto en Google Wallet.
 * (Apple se actualiza al re-descargar el pase; el push APNs del web service
 * de PassKit queda documentado como pendiente en applePass.js.)
 */
export function notifyWalletUpdate(customerId) {
  const card = db.prepare(`
    SELECT k.stamps, k.status, t.name AS template_name, t.stamps_required, t.color, t.icon,
           r.name AS reward_name
    FROM cards k
    JOIN card_templates t ON t.id = k.template_id
    LEFT JOIN rewards r ON r.id = t.reward_id
    WHERE k.customer_id = ? AND k.status IN ('active','reward_ready')
    ORDER BY k.created_at ASC LIMIT 1
  `).get(customerId);
  if (!card) return;

  db.prepare(`
    UPDATE wallet_passes
    SET stamps_snapshot = ?, status_snapshot = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE customer_id = ?
  `).run(card.stamps, card.status, customerId);

  if (googleConfigured()) {
    const googlePass = db
      .prepare("SELECT serial FROM wallet_passes WHERE customer_id = ? AND platform = 'google'")
      .get(customerId);
    if (googlePass) {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
      const business = db.prepare('SELECT name, slug, icon, theme FROM businesses WHERE id = ?')
        .get(customer.business_id);
      patchLoyaltyObject(buildPassData(customer, card, business), googlePass.serial)
        .catch((e) => console.error('Error actualizando Google Wallet:', e.message));
    }
  }
}
