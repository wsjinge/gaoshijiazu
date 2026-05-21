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
const isVercel = process.env.VERCEL === '1';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Avatar upload (use /tmp on Vercel, local disk otherwise)
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1025 * 1025 } });

app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Auto-seed on first request (runs once)
let seeded = false;
app.use(async (req, res, next) => {
  req.db = await getDb();
  req.saveDb = save;
  if (!seeded) {
    const row = req.db.exec('SELECT COUNT(*) as cnt FROM members');
    const count = row[0]?.values?.[0]?.[0] ?? 0;
    if (count === 0) {
      console.log('📦 Empty database detected, running seed...');
      const { default: seed } = await import('./seed.js');
      await seed();
    }
    seeded = true;
  }
  next();
});

app.use('/api/members', membersRouter);
app.use('/api/generations', generationsRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/lunar', lunarRouter);

// Serve frontend static files (production / Vercel)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
// Only add if client/dist actually exists (not in dev mode)
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API, non-uploads route serves index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

export default app;
