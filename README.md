# Fresko Rewards — Sistema Digital de Recompensas (Demo)

Demo funcional de un sistema de fidelización con tarjetas digitales de sellos para un negocio de smoothies y bebidas frías.

- **Panel administrativo** (`/admin`): dashboard, clientes, registro de sellos, tarjetas, recompensas e historial.
- **Portal del cliente** (`/c/CODIGO`): tarjeta digital, progreso de sellos, QR personal, premios e historial. Optimizado para celular.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS (`client/`)
- **Backend:** Node.js + Express (`server/`)
- **Base de datos:** SQLite (better-sqlite3)

## Desarrollo local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

- App (frontend con proxy a la API): http://localhost:5173
- API: http://localhost:3001

Al iniciar por primera vez se crean datos de ejemplo (clientes, tarjetas y movimientos). Para resetear la demo, borrá `server/data/app.db` y reiniciá el servidor.

## Reglas de negocio implementadas en el servidor

- Cada cliente tiene un código único (`SMO-XXXX`) que es la base de su QR.
- No se permiten sellos duplicados: dos sellos a la misma tarjeta dentro de 60 segundos se rechazan (configurable con `STAMP_COOLDOWN_SECONDS`).
- Todo movimiento (registro, sello, canje) queda en el historial con fecha y hora.
- Un canje solo es posible con la tarjeta completa (`reward_ready`); al canjear se inicia automáticamente una nueva tarjeta.
- El saldo de sellos y el historial se escriben en la misma transacción, por lo que siempre quedan consistentes.

## Apple Wallet y Google Wallet

El portal del cliente incluye los botones **Agregar a Apple Wallet** y **Agregar a Google Wallet** (ordenados según la plataforma del dispositivo). Mientras no haya credenciales oficiales configuradas, el sistema opera en **modo DEMO claramente identificado**: se muestra una vista previa del pase y se registra en `wallet_passes` con un serial estable por cliente (`PK-SMO-XXXX` / `GW-SMO-XXXX`), que **nunca cambia por compra**. Cada sello o canje actualiza automáticamente el snapshot del pase (`notifyWalletUpdate`), que en modo real dispara el push de Apple (APNs) y el PATCH del LoyaltyObject de Google.

Para activar las integraciones oficiales (`server/wallet/`):

**Apple Wallet** (PassKit, `applePass.js`):
- `APPLE_PASS_TYPE_ID` — ej. `pass.com.fresko.rewards`
- `APPLE_TEAM_ID` — Team ID de Apple Developer
- `APPLE_PASS_CERT_P12_B64` + `APPLE_PASS_CERT_PASSWORD` — certificado del Pass Type ID
- `APPLE_WWDR_CERT_PEM_B64` — certificado intermedio WWDR
- Falta implementar: firma PKCS#7 del manifest, empaquetado `.pkpass` y el web service de actualización de pases.

**Google Wallet** (`googleWallet.js`):
- `GOOGLE_WALLET_ISSUER_ID` — Issuer ID de Google Pay & Wallet Console
- `GOOGLE_SERVICE_ACCOUNT_JSON` — credenciales de la cuenta de servicio
- Falta implementar: creación de la LoyaltyClass, firma del JWT de guardado y PATCH del objeto en cada actualización.

El QR del pase contiene solo el código público del cliente (`SMO-XXXX`), sin datos sensibles.

## Despliegue en Railway

1. Subí el repositorio a GitHub y creá un servicio en Railway desde ese repo. Railway usa `railway.json` (build: `npm install && npm run build`, start: `npm start`).
2. **Volumen:** en el servicio, agregá un volumen montado en `/data` para que la base de datos sobreviva a los deploys.
3. **Variables de entorno:**
   - `DATABASE_PATH=/data/app.db`
   - (opcional) `STAMP_COOLDOWN_SECONDS=60`
4. Generá un dominio público en **Settings → Networking**.

Si el volumen está vacío (primer deploy), la base se crea y se cargan los datos de ejemplo automáticamente.

## Estructura

```
├── client/          # React + Vite + Tailwind
│   └── src/
│       ├── pages/admin/    # Panel administrativo
│       ├── pages/portal/   # Portal del cliente
│       ├── components/     # StampCard, layout, UI compartida
│       └── lib/            # api fetch wrapper, temas y formatos
├── server/          # Express + SQLite
│   ├── index.js     # API + sirve client/dist en producción
│   ├── db.js        # Esquema y conexión
│   ├── seed.js      # Datos de ejemplo
│   └── routes/      # customers, cards, templates, rewards, movements, stats
└── railway.json     # Configuración de build/deploy en Railway
```
