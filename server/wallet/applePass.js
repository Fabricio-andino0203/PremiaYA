/**
 * Apple Wallet (PassKit) — arquitectura lista para la integración oficial.
 *
 * Para activar el modo real se necesitan estas variables de entorno:
 *   APPLE_PASS_TYPE_ID        p. ej. pass.com.fresko.rewards
 *   APPLE_TEAM_ID             Team ID de la cuenta Apple Developer
 *   APPLE_PASS_CERT_P12_B64   Certificado del Pass Type ID (.p12) en base64
 *   APPLE_PASS_CERT_PASSWORD  Contraseña del .p12
 *   APPLE_WWDR_CERT_PEM_B64   Certificado intermedio WWDR de Apple en base64
 *
 * Con eso configurado, generateSignedPass() debe:
 *   1. Construir el bundle del pase (pass.json + imágenes + manifest.json).
 *   2. Firmar el manifest con el certificado (signature PKCS#7).
 *   3. Empaquetar todo como .pkpass (ZIP) y servirlo con
 *      Content-Type: application/vnd.apple.pkpass.
 * La actualización automática usa el web service de PassKit
 * (webServiceURL + authenticationToken en pass.json) y push APNs.
 */

export function appleConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_CERT_P12_B64 &&
    process.env.APPLE_PASS_CERT_PASSWORD
  );
}

/** Estructura pass.json (storeCard) a partir de los datos neutrales del pase. */
export function buildPassJson(passData, serial, baseUrl) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.demo.fresko.rewards',
    teamIdentifier: process.env.APPLE_TEAM_ID || 'DEMO',
    serialNumber: serial,
    organizationName: passData.businessName,
    description: `Tarjeta de recompensas de ${passData.businessName}`,
    logoText: passData.businessName,
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(244,63,94)',
    webServiceURL: baseUrl ? `${baseUrl}/api/wallet/apple` : undefined,
    authenticationToken: undefined, // token por pase al activar la integración
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
    },
    barcodes: [
      { format: 'PKBarcodeFormatQR', message: passData.qrValue, messageEncoding: 'iso-8859-1' },
    ],
  };
}

export function generateSignedPass() {
  if (!appleConfigured()) {
    const err = new Error('Apple Wallet no está configurado (modo demo).');
    err.code = 'WALLET_NOT_CONFIGURED';
    throw err;
  }
  // Implementar firma y empaquetado .pkpass al conectar los certificados.
  throw new Error('Firma de .pkpass pendiente de implementación.');
}
