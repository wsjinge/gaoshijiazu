import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1';

// On Vercel: use /tmp/data.db for runtime (writable), fallback to prebuilt.db from deployment bundle
const runtimeDbPath = isVercel ? '/tmp/data.db' : path.join(__dirname, 'data.db');
const prebuiltDbPath = path.join(__dirname, 'prebuilt.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Priority: runtime db > prebuilt.db > fresh empty db
  let loaded = false;
  if (fs.existsSync(runtimeDbPath)) {
    const buffer = fs.readFileSync(runtimeDbPath);
    db = new SQL.Database(buffer);
    loaded = true;
  } else if (fs.existsSync(prebuiltDbPath)) {
    const buffer = fs.readFileSync(prebuiltDbPath);
    db = new SQL.Database(buffer);
    loaded = true;
  }

  if (!loaded) {
    db = new SQL.Database();
  }

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
