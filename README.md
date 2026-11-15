# 🎁 PremiaYa — Sistema de fidelización y recompensas (SaaS)

*Premia a tus clientes. Hazlos volver.* — By Andino Software

Plataforma SaaS multi-tenant de tarjetas digitales de sellos para cafeterías, smoothie bars, heladerías, restaurantes y más.

## Módulos

- **Super Admin** (`/super`): dashboard del SaaS, gestión de negocios (alta con usuario dueño), planes y precios, registro de pagos.
- **Panel del negocio** (`/admin`): dashboard, clientes, registro de sellos, tarjetas, recompensas, historial y ajustes (marca, WhatsApp, QR de auto-registro, plan y pagos).
- **Portal del cliente** (`/c/CODIGO`): tarjeta digital con la marca del negocio, QR personal, Apple/Google Wallet e historial. Móvil-first, sin login.
- **Auto-registro** (`/r/slug-del-negocio`): página pública para que el cliente se registre solo escaneando el QR del mostrador.

## Stack

React 18 + Vite + Tailwind (cliente) · Node/Express + SQLite (servidor) · Sesiones con cookie httpOnly + bcrypt.

## Desarrollo local

```bash
npm install
npm run dev
```

- App: http://localhost:5173 · API: http://localhost:3001
- **Credenciales demo** — Negocio: `demo@fresko.com` / `fresko123` · Super admin: `superadmin@premiaya.com` / `PremiaYa#2026` (cambiarlas en producción).
- Para resetear la demo: borrá `server/data/app.db` y reiniciá.

## Reglas de negocio

- Multi-tenant: cada negocio ve solo sus clientes, tarjetas, premios y movimientos.
- Código único de cliente (`PY-XXXX`) = QR permanente, sin datos sensibles.
- Anti-duplicado de sellos (60 s, `STAMP_COOLDOWN_SECONDS`); canje solo con tarjeta completa; nueva tarjeta automática tras canje; historial transaccional consistente.
- Límite de clientes por plan (se valida al registrar, en panel y en auto-registro).
- Negocios suspendidos: sin acceso al panel ni al auto-registro.

## WhatsApp

Desde el detalle del cliente, el botón **Enviar por WhatsApp** abre `wa.me` con el enlace de la tarjeta. El código de país se configura en Ajustes (p. ej. 506 CR, 504 HN, 52 MX). No requiere API de Meta; para envíos automáticos masivos se integraría WhatsApp Business API después.

## Apple Wallet y Google Wallet

La **firma real está implementada** (`server/wallet/`): `.pkpass` firmado (PKCS#7 + manifest, pipeline verificado con certificado de prueba) y JWT RS256 de Google con creación de clase + PATCH del objeto al sumar sellos. Sin credenciales, el portal opera en modo **DEMO claramente identificado**.

Para activarlas, configurar en Railway (variables del servicio):

**Apple Wallet** — requiere cuenta Apple Developer ($99/año):
| Variable | Qué es |
|---|---|
| `APPLE_PASS_TYPE_ID` | Pass Type ID (ej. `pass.com.premiaya.rewards`), creado en el portal de Apple Developer |
| `APPLE_TEAM_ID` | Team ID de la cuenta |
| `APPLE_PASS_CERT_P12_B64` | Certificado del Pass Type ID exportado como `.p12`, en base64 |
| `APPLE_PASS_CERT_PASSWORD` | Contraseña del `.p12` |
| `APPLE_WWDR_CERT_PEM_B64` | Certificado intermedio WWDR de Apple (PEM) en base64 |

Pendiente para actualización push en iPhone: web service de PassKit + APNs (hoy el pase se actualiza al re-descargarlo).

**Google Wallet** — requiere cuenta en Google Pay & Wallet Console:
| Variable | Qué es |
|---|---|
| `GOOGLE_WALLET_ISSUER_ID` | Issuer ID numérico de la consola |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de la cuenta de servicio con rol Wallet Object Issuer |

Con esto, el botón genera el enlace real "Guardar en Google Wallet" y cada sello actualiza el pase automáticamente (PATCH del LoyaltyObject).

## Despliegue en Railway

1. Push a `main` → redeploy automático (servicio conectado al repo).
2. Volumen montado en `/data` + `DATABASE_PATH=/data/app.db` (ya configurado).
3. Variables opcionales: `STAMP_COOLDOWN_SECONDS` y las credenciales Wallet de arriba.
4. Healthcheck: `/api/stats/health`.

⚠️ La migración demo→SaaS recrea la base si detecta el esquema anterior (se pierden los datos demo previos).

## Estructura

```
├── client/src/
│   ├── pages/admin/     # Panel del negocio (+ Configuración)
│   ├── pages/super/     # Super admin (Dashboard, Negocios, Planes, Pagos)
│   ├── pages/portal/    # Portal del cliente
│   ├── pages/Login.jsx  # Login unificado
│   ├── pages/Registro.jsx  # Auto-registro público /r/:slug
│   ├── components/      # StampCard, WalletSection, layouts, UI
│   └── lib/             # api, auth (contexto), temas
└── server/
    ├── auth.js          # Sesiones, bcrypt, middlewares de rol
    ├── db.js            # Esquema multi-tenant + migración
    ├── routes/          # auth, super, business, public, customers, cards…
    └── wallet/          # applePass (pkpass firmado), googleWallet (JWT+API), png
```
