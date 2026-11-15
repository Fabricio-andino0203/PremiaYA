/**
 * Google Wallet (Loyalty) — firma real del JWT de guardado y actualización por API.
 *
 * Variables de entorno necesarias (de Google Pay & Wallet Console):
 *   GOOGLE_WALLET_ISSUER_ID       Issuer ID numérico
 *   GOOGLE_SERVICE_ACCOUNT_JSON   JSON completo de la cuenta de servicio
 *
 * - buildSaveUrl() firma el JWT RS256 e incluye clase + objeto, así la clase
 *   se crea sola la primera vez que alguien guarda la tarjeta.
 * - patchLoyaltyObject() actualiza sellos/recompensa del objeto cuando cambian.
 */
import crypto from 'node:crypto';

const API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1';

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function serviceAccount() {
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

const b64url = (input) =>
  Buffer.from(typeof input === 'string' ? input : JSON.stringify(input)).toString('base64url');

function signJwtRS256(claims, privateKeyPem) {
  const input = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}`;
  const signature = crypto.createSign('RSA-SHA256').update(input).sign(privateKeyPem);
  return `${input}.${signature.toString('base64url')}`;
}

const slugSafe = (s) => String(s || 'premiaya').replace(/[^a-zA-Z0-9_]/g, '_');

export function classIdFor(passData) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID || 'DEMO_ISSUER';
  return `${issuer}.premiaya_${slugSafe(passData.businessSlug)}`;
}

export function objectIdFor(serial) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID || 'DEMO_ISSUER';
  return `${issuer}.${slugSafe(serial)}`;
}

export function buildLoyaltyClass(passData) {
  return {
    id: classIdFor(passData),
    issuerName: 'PremiaYa',
    programName: `${passData.businessName} · Recompensas`,
    programLogo: {
      sourceUri: { uri: 'https://premiaya-production.up.railway.app/premiaya-logo.png' },
      contentDescription: { defaultValue: { language: 'es', value: 'PremiaYa' } },
    },
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: '#6C2BD9',
  };
}

export function buildLoyaltyObject(passData, serial) {
  return {
    id: objectIdFor(serial),
    classId: classIdFor(passData),
    state: 'ACTIVE',
    accountName: passData.customerName,
    accountId: passData.cardId,
    loyaltyPoints: {
      label: 'Sellos',
      balance: { string: `${passData.stamps}/${passData.stampsRequired}` },
    },
    textModulesData: [
      {
        id: 'reward',
        header: passData.rewardReady ? 'Recompensa lista 🎁' : 'Próxima recompensa',
        body: passData.rewardName || '—',
      },
      { id: 'card', header: 'Tarjeta', body: passData.templateName || '' },
    ],
    barcode: { type: 'QR_CODE', value: passData.qrValue },
    hexBackgroundColor: '#6C2BD9',
  };
}

/** Link "Guardar en Google Wallet" (https://pay.google.com/gp/v/save/<jwt>). */
export function buildSaveUrl(passData, serial) {
  if (!googleConfigured()) {
    const err = new Error('Google Wallet no está configurado (modo demo).');
    err.code = 'WALLET_NOT_CONFIGURED';
    throw err;
  }
  const sa = serviceAccount();
  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [],
    payload: {
      loyaltyClasses: [buildLoyaltyClass(passData)],
      loyaltyObjects: [buildLoyaltyObject(passData, serial)],
    },
  };
  return `https://pay.google.com/gp/v/save/${signJwtRS256(claims, sa.private_key)}`;
}

async function getAccessToken() {
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRS256(
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    sa.private_key
  );
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`OAuth de Google falló: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

/** Actualiza sellos/recompensa del objeto en Google Wallet (llamado tras cada sello/canje). */
export async function patchLoyaltyObject(passData, serial) {
  if (!googleConfigured()) return;
  const token = await getAccessToken();
  const object = buildLoyaltyObject(passData, serial);
  const res = await fetch(`${API_BASE}/loyaltyObject/${encodeURIComponent(object.id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loyaltyPoints: object.loyaltyPoints,
      textModulesData: object.textModulesData,
    }),
  });
  // 404: el objeto aún no fue guardado por el cliente; no es un error.
  if (!res.ok && res.status !== 404) {
    console.error(`Google Wallet PATCH falló (${serial}): ${res.status} ${await res.text()}`);
  }
}
