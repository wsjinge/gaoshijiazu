import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { getDb, save } from './db.js';
import membersRouter from './routes/members.js';
import generationsRouter from './routes/generations.js';
import statisticsRouter from './routes/statistics.js';
import lunarRouter from './routes/lunar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Avatar upload
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Make db accessible to routes
app.use(async (req, res, next) => {
  req.db = await getDb();
  req.saveDb = save;
  next();
});

app.use('/api/members', membersRouter);
app.use('/api/generations', generationsRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/lunar', lunarRouter);

// In production, serve built client static files
if (isProduction) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  // SPA fallback: any non-API route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function start() {
  // Auto-seed if database is empty
  const db = await getDb();
  const row = db.exec('SELECT COUNT(*) as cnt FROM members');
  const count = row[0]?.values?.[0]?.[0] ?? 0;
  if (count === 0) {
    console.log('📦 Empty database detected, running seed...');
    const { default: seed } = await import('./seed.js');
    await seed();
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}${isProduction ? ' (production)' : ''}`);
  });
}

start().catch(e => { console.error('Failed to start:', e); process.exit(1); });
