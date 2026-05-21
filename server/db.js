import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PREBUILT_DB_BASE64 from './db-base64.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1';

// On Vercel: use /tmp/data.db for runtime (writable), fallback to prebuilt.db from deployment bundle
const runtimeDbPath = isVercel ? '/tmp/data.db' : path.join(__dirname, 'data.db');
const prebuiltDbPath = path.join(__dirname, 'prebuilt.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Priority: runtime db > prebuilt.db > base64 fallback > db_b64.txt > fresh empty db
  let loaded = false;
  let source = 'none';

  // 1) Runtime data.db (/tmp on Vercel)
  if (!loaded && fs.existsSync(runtimeDbPath)) {
    try {
      const buffer = fs.readFileSync(runtimeDbPath);
      db = new SQL.Database(buffer);
      const cnt = db.exec('SELECT COUNT(*) FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
      if (cnt > 0) { loaded = true; source = 'runtime'; }
    } catch (e) { console.error('db: runtime load failed', e.message); }
  }

  // 2) prebuilt.db from deployment bundle
  if (!loaded && fs.existsSync(prebuiltDbPath)) {
    try {
      const buffer = fs.readFileSync(prebuiltDbPath);
      db = new SQL.Database(buffer);
      const cnt = db.exec('SELECT COUNT(*) FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
      if (cnt > 0) { loaded = true; source = 'prebuilt'; }
    } catch (e) { console.error('db: prebuilt load failed', e.message); }
  }

  // 3) Embedded base64 string
  if (!loaded && PREBUILT_DB_BASE64) {
    try {
      const buffer = Buffer.from(PREBUILT_DB_BASE64, 'base64');
      db = new SQL.Database(buffer);
      const cnt = db.exec('SELECT COUNT(*) FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
      if (cnt > 0) { loaded = true; source = 'base64'; }
    } catch (e) { console.error('db: base64 fallback failed', e.message); }
  }

  // 4) db_b64.txt file at runtime (last resort before empty)
  if (!loaded) {
    try {
      const b64path = path.join(__dirname, 'db_b64.txt');
      if (fs.existsSync(b64path)) {
        const b64 = fs.readFileSync(b64path, 'utf-8');
        const buffer = Buffer.from(b64.trim(), 'base64');
        db = new SQL.Database(buffer);
        const cnt = db.exec('SELECT COUNT(*) FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
        if (cnt > 0) { loaded = true; source = 'b64file'; }
      }
    } catch (e) { console.error('db: db_b64.txt fallback failed', e.message); }
  }

  if (!loaded) {
    console.log('⚠️ All database sources failed, creating empty database');
    db = new SQL.Database();
  }

  console.log(`📦 Database loaded from: ${source}`);
  db.run('PRAGMA foreign_keys = ON');
  initSchema();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY,
      number INTEGER NOT NULL UNIQUE,
      pai_zi TEXT NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pai_name TEXT,
      generation_id INTEGER NOT NULL,
      gender TEXT DEFAULT '男',
      birth_year INTEGER,
      birth_month INTEGER,
      birth_day INTEGER,
      birth_hour INTEGER,
      birth_minute INTEGER,
      is_deceased INTEGER DEFAULT 0,
      death_year INTEGER,
      death_month INTEGER,
      death_day INTEGER,
      death_hour INTEGER,
      death_minute INTEGER,
      father_id INTEGER,
      father_order INTEGER,
      spouse_info TEXT DEFAULT '[]',
      avatar TEXT,
      notes TEXT,
      is_adopted INTEGER DEFAULT 0,
      adoption_note TEXT,
      is_shang INTEGER DEFAULT 0,
      has_posterity INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (generation_id) REFERENCES generations(id),
      FOREIGN KEY (father_id) REFERENCES members(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      father_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL UNIQUE,
      child_order INTEGER DEFAULT 1,
      FOREIGN KEY (father_id) REFERENCES members(id),
      FOREIGN KEY (child_id) REFERENCES members(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_members_generation ON members(generation_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_members_father ON members(father_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_children_father ON children(father_id)');

  // Add burial column if not exists (for schema upgrades)
  try { db.run("ALTER TABLE members ADD COLUMN burial TEXT"); } catch(e) {}
  try { db.run("ALTER TABLE members ADD COLUMN residence TEXT"); } catch(e) {}

  save();
}

export function save() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(runtimeDbPath, buffer);
  }
}

export default { getDb, save };
