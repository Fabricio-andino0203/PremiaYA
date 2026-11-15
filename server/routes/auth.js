import { Router } from 'express';
import { db, sendError } from '../db.js';
import {
  verifyPassword, createSession, destroySession, cookieOptions,
  SESSION_COOKIE, mePayload, attachUser,
} from '../auth.js';
import { businessWithPlan } from '../db.js';

const router = Router();

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return sendError(res, 401, 'Correo o contraseña incorrectos.');
  }
  const token = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role, business_id: user.business_id };
  req.business = user.business_id ? businessWithPlan(user.business_id) : null;
  res.json(mePayload(req));
});

router.post('/logout', (req, res) => {
  destroySession(req.cookies?.[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', attachUser, (req, res) => {
  if (!req.user) return sendError(res, 401, 'Sin sesión activa.');
  res.json(mePayload(req));
});

export default router;
