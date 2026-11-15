/**
 * Apple Wallet (PassKit) — firma real de .pkpass.
 *
 * Variables de entorno necesarias (de la cuenta Apple Developer del negocio):
 *   APPLE_PASS_TYPE_ID        p. ej. pass.com.premiaya.rewards
 *   APPLE_TEAM_ID             Team ID de la cuenta Apple Developer
 *   APPLE_PASS_CERT_P12_B64   Certificado del Pass Type ID (.p12) en base64
 *   APPLE_PASS_CERT_PASSWORD  Contraseña del .p12
 *   APPLE_WWDR_CERT_PEM_B64   (opcional pero recomendado) Certificado WWDR en base64
 *
 * Pendiente para actualización push: el web service de PassKit
 * (registro de dispositivos + push APNs). Mientras tanto, el pase se
 * actualiza al re-descargarse desde el portal.
 */
import crypto from 'node:crypto';
import forge from 'node-forge';
import AdmZip from 'adm-zip';
import { solidPng } from './png.js';

const BRAND_PURPLE = [108, 43, 217]; // #6C2BD9

export function appleConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_CERT_P12_B64 &&
    process.env.APPLE_PASS_CERT_PASSWORD
  );
}

/** Estructura pass.json (storeCard) a partir de los datos neutrales del pase. */
export function buildPassJson(passData, serial) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.demo.premiaya.rewards',
    teamIdentifier: process.env.APPLE_TEAM_ID || 'DEMO',
    serialNumber: serial,
    organizationName: passData.businessName,
    description: `Tarjeta de recompensas de ${passData.businessName}`,
    logoText: passData.businessName,
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(108,43,217)',
    labelColor: 'rgb(237,226,255)',
    storeCard: {
      primaryFields: [
        { key: 'stamps', label: 'Sellos', value: `${passData.stamps}/${passData.stampsRequired}` },
      ],
      secondaryFields: [
        { key: 'member', label: 'Cliente', value: passData.customerName },
        { key: 'card', label: 'Tarjeta', value: passData.templateName || '' },
      ],
      auxiliaryFields: [
        {
          key: 'reward',
          label: passData.rewardReady ? 'Recompensa lista' : 'Próxima recompensa',
          value: passData.rewardName || '—',
        },
      ],
      backFields: [
        { key: 'code', label: 'Código de cliente', value: passData.cardId },
        { key: 'brand', label: 'Programa', value: 'PremiaYa · premia a tus clientes' },
      ],
    },
    barcodes: [
      { format: 'PKBarcodeFormatQR', message: passData.qrValue, messageEncoding: 'iso-8859-1' },
    ],
  };
}

function loadSigningMaterial() {
  const p12Der = forge.util.decode64(process.env.APPLE_PASS_CERT_P12_B64);
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(p12Der),
    process.env.APPLE_PASS_CERT_PASSWORD
  );

  let key = null;
  let cert = null;
  for (const safeContents of p12.safeContents) {
    for (const bag of safeContents.safeBags) {
      if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag || bag.type === forge.pki.oids.keyBag) {
        key = bag.key;
      } else if (bag.type === forge.pki.oids.certBag && bag.cert) {
        cert = bag.cert;
      }
    }
  }
  if (!key || !cert) throw new Error('El .p12 no contiene clave y certificado válidos.');

  let wwdr = null;
  if (process.env.APPLE_WWDR_CERT_PEM_B64) {
    const pem = Buffer.from(process.env.APPLE_WWDR_CERT_PEM_B64, 'base64').toString('utf8');
    wwdr = forge.pki.certificateFromPem(pem);
  }
  return { key, cert, wwdr };
}

function signManifest(manifestJson, { key, cert, wwdr }) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestJson, 'utf8');
  p7.addCertificate(cert);
  if (wwdr) p7.addCertificate(wwdr);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
}

/** Genera el .pkpass firmado (Buffer). Lanza WALLET_NOT_CONFIGURED sin credenciales. */
export function generateSignedPass(passData, serial, { material } = {}) {
  if (!appleConfigured() && !material) {
    const err = new Error('Apple Wallet no está configurado (modo demo).');
    err.code = 'WALLET_NOT_CONFIGURED';
    throw err;
  }

  const files = {
    'pass.json': Buffer.from(JSON.stringify(buildPassJson(passData, serial)), 'utf8'),
    'icon.png': solidPng(29, 29, BRAND_PURPLE),
    'icon@2x.png': solidPng(58, 58, BRAND_PURPLE),
    'logo.png': solidPng(160, 50, BRAND_PURPLE),
    'logo@2x.png': solidPng(320, 100, BRAND_PURPLE),
  };

  const manifest = {};
  for (const [name, buf] of Object.entries(files)) {
    manifest[name] = crypto.createHash('sha1').update(buf).digest('hex');
  }
  const manifestJson = JSON.stringify(manifest);
  const signature = signManifest(manifestJson, material || loadSigningMaterial());

  const zip = new AdmZip();
  for (const [name, buf] of Object.entries(files)) zip.addFile(name, buf);
  zip.addFile('manifest.json', Buffer.from(manifestJson, 'utf8'));
  zip.addFile('signature', signature);
  return zip.toBuffer();
}
