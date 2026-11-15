import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, sendError, businessWithPlan } from './db.js';

const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'pya_session';

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const verifyPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expires);
  return token;
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    maxAge: SESSION_DAYS * 86400000,
    path: '/',
  };
}

/** Carga req.user y req.business desde la cookie de sesión (si existe). */
export function attachUser(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const row = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.business_id
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, new Date().toISOString());
    if (row) {
      req.user = row;
      req.sessionToken = token;
      if (row.business_id) req.business = businessWithPlan(row.business_id);
    }
  }
  next();
}

export function requireBusiness(req, res, next) {
  if (!req.user) return sendError(res, 401, 'Iniciá sesión para continuar.');
  if (!req.business) return sendError(res, 403, 'Esta cuenta no tiene un negocio asociado.');
  if (req.business.status !== 'active') {
    return sendError(res, 403, 'Tu cuenta está suspendida. Contactá a PremiaYa.');
  }
  next();
}

export function requireSuper(req, res, next) {
  if (!req.user) return sendError(res, 401, 'Iniciá sesión para continuar.');
  if (req.user.role !== 'superadmin') return sendError(res, 403, 'Acceso solo para super admin.');
  next();
}

export function mePayload(req) {
  const { id, name, email, role } = req.user;
  return { id, name, email, role, business: req.business || null };
}
