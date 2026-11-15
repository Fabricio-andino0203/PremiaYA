import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Migración v2 (demo → SaaS multi-tenant): si existe un esquema anterior sin
 * business_id, la base demo se recrea desde cero con el seed multi-tenant.
 */
function tableHasColumn(table, column) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  } catch {
    return false;
  }
}
const hasOldSchema =
  db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='customers'").get() &&
  !tableHasColumn('customers', 'business_id');

if (hasOldSchema) {
  console.log('Esquema anterior detectado: recreando base demo en formato multi-tenant…');
  db.pragma('foreign_keys = OFF');
  for (const t of ['wallet_passes', 'movements', 'cards', 'card_templates', 'rewards', 'customers']) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  db.pragma('foreign_keys = ON');
}

db.exec(`
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_monthly REAL NOT NULL DEFAULT 0,
  max_customers INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎁',
  logo TEXT,
  theme TEXT NOT NULL DEFAULT 'berry',
  whatsapp_country_code TEXT NOT NULL DEFAULT '506',
  plan_id INTEGER REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('superadmin','owner')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  plan_id INTEGER REFERENCES plans(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'manual',
  period_label TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (business_id, phone)
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stamps_required INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS card_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stamps_required INTEGER NOT NULL,
  reward_id INTEGER REFERENCES rewards(id),
  color TEXT NOT NULL DEFAULT 'mango',
  icon TEXT NOT NULL DEFAULT '🥤',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  template_id INTEGER NOT NULL REFERENCES card_templates(id),
  stamps INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reward_ready','redeemed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT,
  redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  card_id INTEGER REFERENCES cards(id),
  type TEXT NOT NULL CHECK (type IN ('register','stamp','redeem')),
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS wallet_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  platform TEXT NOT NULL CHECK (platform IN ('apple','google')),
  serial TEXT UNIQUE NOT NULL,
  stamps_snapshot INTEGER NOT NULL DEFAULT 0,
  status_snapshot TEXT NOT NULL DEFAULT 'active',
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (customer_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_cards_customer ON cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_movements_customer ON movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_movements_card ON movements(card_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

// Migraciones aditivas sobre bases existentes
if (!tableHasColumn('businesses', 'logo')) {
  db.exec('ALTER TABLE businesses ADD COLUMN logo TEXT');
}

export const nowISO = () => new Date().toISOString();

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCustomerCode() {
  const exists = db.prepare('SELECT 1 FROM customers WHERE code = ?');
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const code = `PY-${suffix}`;
    if (!exists.get(code)) return code;
  }
  throw new Error('No se pudo generar un código único');
}

export function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

/** Negocio con su plan y uso actual. */
export function businessWithPlan(businessId) {
  const business = db.prepare(`
    SELECT b.*, p.name AS plan_name, p.price_monthly AS plan_price, p.max_customers AS plan_max_customers
    FROM businesses b LEFT JOIN plans p ON p.id = b.plan_id
    WHERE b.id = ?
  `).get(businessId);
  if (!business) return null;
  business.customer_count = db
    .prepare('SELECT COUNT(*) AS n FROM customers WHERE business_id = ?')
    .get(businessId).n;
  return business;
}

/** Límite del plan: null = ilimitado. Devuelve mensaje de error o null. */
export function checkCustomerLimit(businessId) {
  const b = businessWithPlan(businessId);
  if (!b) return 'Negocio no encontrado.';
  if (b.plan_max_customers != null && b.customer_count >= b.plan_max_customers) {
    return `Alcanzaste el límite de ${b.plan_max_customers} clientes del plan ${b.plan_name}. Mejorá tu plan para seguir registrando.`;
  }
  return null;
}
