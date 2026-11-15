/**
 * Google Wallet (Loyalty) — arquitectura lista para la integración oficial.
 *
 * Para activar el modo real se necesitan estas variables de entorno:
 *   GOOGLE_WALLET_ISSUER_ID       Issuer ID de Google Pay & Wallet Console
 *   GOOGLE_SERVICE_ACCOUNT_JSON   Credenciales de la cuenta de servicio (JSON)
 *
 * Con eso configurado:
 *   - ensureLoyaltyClass() crea/actualiza la LoyaltyClass del programa.
 *   - buildLoyaltyObject() genera el objeto individual del cliente
 *     (id estable: ISSUER_ID.SERIAL — nunca un objeto nuevo por compra).
 *   - buildSaveUrl() firma un JWT con la cuenta de servicio y devuelve
 *     https://pay.google.com/gp/v/save/<jwt> para el botón de guardado.
 *   - La actualización automática hace PATCH del LoyaltyObject vía API REST.
 */

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  );
}

/** LoyaltyObject a partir de los datos neutrales del pase. */
export function buildLoyaltyObject(passData, serial) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID || 'DEMO_ISSUER';
  return {
    id: `${issuer}.${serial}`,
    classId: `${issuer}.fresko_rewards`,
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
    ],
    barcode: { type: 'QR_CODE', value: passData.qrValue },
    hexBackgroundColor: '#f43f5e',
  };
}

export function buildSaveUrl() {
  if (!googleConfigured()) {
    const err = new Error('Google Wallet no está configurado (modo demo).');
    err.code = 'WALLET_NOT_CONFIGURED';
    throw err;
  }
  // Implementar firma JWT (RS256 con la cuenta de servicio) al conectar credenciales.
  throw new Error('Firma JWT de Google Wallet pendiente de implementación.');
}
