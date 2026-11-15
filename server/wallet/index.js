import { db } from '../db.js';
import { appleConfigured } from './applePass.js';
import { googleConfigured } from './googleWallet.js';

/**
 * Estado de las integraciones oficiales.
 * Mientras no haya credenciales configuradas, el sistema opera en modo DEMO:
 * los pases se registran y actualizan en la base local, y el portal muestra
 * una vista previa claramente identificada como demo.
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
 * Datos del pase, neutrales a la plataforma. Tanto el pass.json de Apple
 * (PassKit) como el LoyaltyObject de Google se construyen a partir de esto.
 * El QR contiene solo el código público del cliente (sin datos sensibles).
 */
export function buildPassData(customer, card) {
  return {
    businessName: 'Fresko Rewards',
    customerName: customer.name,
    cardId: customer.code,
    qrValue: customer.code,
    templateName: card ? card.template_name : null,
    icon: card ? card.icon : '🥤',
    color: card ? card.color : 'strawberry',
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
 * Llamado tras cada sello o canje. En modo DEMO sincroniza el snapshot local
 * (lo que el cliente ve como "actualización automática"). Con credenciales
 * configuradas, aquí se dispara además la notificación push de Apple
 * (APNs → el dispositivo re-descarga el .pkpass) y el PATCH del
 * LoyaltyObject en la API de Google Wallet.
 */
export function notifyWalletUpdate(customerId) {
  const card = db.prepare(`
    SELECT k.stamps, k.status FROM cards k
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

  const status = walletStatus();
  if (status.apple.configured || status.google.configured) {
    // Integración oficial: enviar push APNs / PATCH a Google Wallet API.
    // Se implementa al conectar los certificados (ver README).
  }
}
