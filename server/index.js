import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedIfEmpty } from './seed.js';
import customersRouter from './routes/customers.js';
import cardsRouter from './routes/cards.js';
import templatesRouter from './routes/templates.js';
import rewardsRouter from './routes/rewards.js';
import movementsRouter from './routes/movements.js';
import statsRouter from './routes/stats.js';
import walletRouter from './routes/wallet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

seedIfEmpty();

const app = express();
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/card-templates', templatesRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/wallet', walletRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Serve built client (production / Railway)
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
