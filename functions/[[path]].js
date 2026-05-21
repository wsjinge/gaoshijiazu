import initSqlJs from 'sql.js';
import PREBUILT_DB_BASE64 from '../server/db-base64.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// ── SQL.js init (cached across requests within the same isolate) ──────────
let sqlInit = null;
function getSQL() {
  if (!sqlInit) {
    sqlInit = initSqlJs({
      locateFile: () => 'https://sql.js.org/dist/sql-wasm.wasm',
    });
  }
  return sqlInit;
}

// ── Database helpers ───────────────────────────────────────────────────────
function query(database, sql, params = []) {
  const stmt = database.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}
function get(database, sql, params = []) {
  const stmt = database.prepare(sql);
  if (params.length) stmt.bind(params);
  let result = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  return result;
}

// ── Load database (KV → base64 fallback) ──────────────────────────────────
async function loadDb(env) {
  const SQL = await getSQL();

  // 1) Try KV
  if (typeof env !== 'undefined' && env.DB) {
    try {
      const data = await env.DB.get('db', 'arrayBuffer');
      if (data) {
        const database = new SQL.Database(new Uint8Array(data));
        const cnt = database.exec('SELECT COUNT(*) FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
        if (cnt > 0) {
          database.run('PRAGMA foreign_keys = ON');
          return database;
        }
      }
    } catch (e) {
      console.error('KV load failed:', e);
    }
  }

  // 2) Prebuilt base64
  const buf = Buffer.from(PREBUILT_DB_BASE64, 'base64');
  const database = new SQL.Database(buf);
  database.run('PRAGMA foreign_keys = ON');

  // Ensure schema exists
  database.run(`CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY, number INTEGER NOT NULL UNIQUE,
    pai_zi TEXT NOT NULL, description TEXT
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    pai_name TEXT, generation_id INTEGER NOT NULL,
    gender TEXT DEFAULT '男',
    birth_year INTEGER, birth_month INTEGER, birth_day INTEGER,
    birth_hour INTEGER, birth_minute INTEGER,
    is_deceased INTEGER DEFAULT 0,
    death_year INTEGER, death_month INTEGER, death_day INTEGER,
    death_hour INTEGER, death_minute INTEGER,
    father_id INTEGER, father_order INTEGER,
    spouse_info TEXT DEFAULT '[]', avatar TEXT, notes TEXT,
    is_adopted INTEGER DEFAULT 0, adoption_note TEXT,
    is_shang INTEGER DEFAULT 0, has_posterity INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generation_id) REFERENCES generations(id),
    FOREIGN KEY (father_id) REFERENCES members(id)
  )`);
  database.run(`CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT, father_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL UNIQUE, child_order INTEGER DEFAULT 1,
    FOREIGN KEY (father_id) REFERENCES members(id),
    FOREIGN KEY (child_id) REFERENCES members(id)
  )`);
  database.run('CREATE INDEX IF NOT EXISTS idx_members_generation ON members(generation_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_members_father ON members(father_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_children_father ON children(father_id)');
  try { database.run("ALTER TABLE members ADD COLUMN burial TEXT"); } catch (e) {}
  try { database.run("ALTER TABLE members ADD COLUMN residence TEXT"); } catch (e) {}

  return database;
}

async function saveDb(database, env) {
  if (typeof env === 'undefined' || !env.DB) return;
  try {
    const data = database.export();
    await env.DB.put('db', data.buffer);
  } catch (e) {
    console.error('KV save failed:', e);
  }
}

// ── Seed (fallback if DB is empty) ─────────────────────────────────────────
function seedIfEmpty(database) {
  const row = database.exec('SELECT COUNT(*) as cnt FROM members');
  const count = row[0]?.values?.[0]?.[0] ?? 0;
  if (count > 0) return;

  console.log('Empty database, seeding...');

  const gens = [
    [1,16,'行','行字派'],[2,17,'修','修字派'],[3,18,'学','学字派'],
    [4,19,'绩','绩字派'],[5,20,'正','正字派'],[6,21,'治','治字派'],
    [7,22,'荣','荣字派'],[8,23,'昌','昌字派'],[9,24,'宗','宗字派'],
    [10,25,'嗣','嗣字派'],[11,26,'衍','衍字派'],[12,27,'庆','庆字派'],
    [13,28,'长','长字派'],[14,29,'久','久字派'],[15,30,'发','发字派'],
    [16,31,'祥','祥字派'],[17,32,'贻','贻字派'],[18,33,'泽','泽字派'],
    [19,34,'增','增字派'],[20,35,'厚','厚字派'],[21,36,'逢','逢字派'],
    [22,37,'时','时字派'],[23,38,'耀','耀字派'],[24,39,'光','光字派'],
    [25,40,'和声','和声字派'],[26,41,'鸣','鸣字派'],
    [27,42,'盛','盛字派'],[28,43,'常','常字派'],[29,44,'守','守字派'],
    [30,45,'纯','纯字派'],[31,46,'良','良字派'],[32,47,'知','知字派'],
    [33,48,'理','理字派'],[34,49,'达','达字派'],[35,50,'义','义字派'],
    [36,51,'德','德字派'],[37,52,'建','建字派'],[38,53,'财','财字派'],
    [39,54,'彰','彰字派'],[40,55,'忠','忠字派'],[41,56,'信','信字派'],
    [42,57,'坚','坚字派'],[43,58,'敏','敏字派'],[44,59,'万','万字派'],
    [45,60,'世','世字派'],[46,61,'杨','杨字派'],[47,62,'芳','芳字派'],
  ];
  for (const g of gens) {
    database.run('INSERT INTO generations VALUES(?,?,?,?)', g);
  }
  console.log(`Seeded ${gens.length} generations`);
}

// ── JSON response helpers ──────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function error(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── Route handlers ─────────────────────────────────────────────────────────
async function handleApi(method, pathname, database, request, env, waitUntil) {
  const url = new URL(request.url);
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/'); // e.g. ['api', 'members', '123']

  // GET /api/health
  if (pathname === '/api/health' && method === 'GET') {
    const memberCnt = database.exec('SELECT COUNT(*) as cnt FROM members')?.[0]?.values?.[0]?.[0] ?? 0;
    const genCnt = database.exec('SELECT COUNT(*) as cnt FROM generations')?.[0]?.values?.[0]?.[0] ?? 0;
    return json({ status: 'ok', members: memberCnt, generations: genCnt, runtime: 'cloudflare-pages' });
  }

  // GET /api/generations
  if (pathname === '/api/generations' && method === 'GET') {
    return json(query(database, 'SELECT * FROM generations ORDER BY number'));
  }

  // GET /api/statistics
  if (pathname === '/api/statistics' && method === 'GET') {
    const total = get(database, 'SELECT COUNT(*) as value FROM members');
    const living = get(database, 'SELECT COUNT(*) as value FROM members WHERE is_deceased = 0');
    const deceased = get(database, "SELECT COUNT(*) as value FROM members WHERE is_deceased = 1 AND death_year IS NOT NULL");
    const deceasedUnknown = get(database, "SELECT COUNT(*) as value FROM members WHERE is_deceased = 1 AND death_year IS NULL");
    const male = get(database, "SELECT COUNT(*) as value FROM members WHERE gender = '男'");
    const female = get(database, "SELECT COUNT(*) as value FROM members WHERE gender = '女'");
    const post80s = get(database, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 1980 AND birth_year < 1990');
    const post90s = get(database, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 1990 AND birth_year < 2000');
    const post00s = get(database, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 2000');
    const adopted = get(database, 'SELECT COUNT(*) as value FROM members WHERE is_adopted = 1');

    const byGenerationLiving = query(database, `
      SELECT g.number as generation, g.pai_zi,
        SUM(CASE WHEN m.is_deceased = 0 THEN 1 ELSE 0 END) as living,
        SUM(CASE WHEN m.is_deceased = 1 AND m.death_year IS NOT NULL THEN 1 ELSE 0 END) as deceased,
        SUM(CASE WHEN m.is_deceased = 1 AND m.death_year IS NULL THEN 1 ELSE 0 END) as deceased_unknown
      FROM members m JOIN generations g ON m.generation_id = g.id
      GROUP BY g.number, g.pai_zi ORDER BY g.number
    `);
    const byGeneration = query(database, `
      SELECT g.number as generation, g.pai_zi, COUNT(*) as count
      FROM members m JOIN generations g ON m.generation_id = g.id
      GROUP BY g.number, g.pai_zi ORDER BY g.number
    `);

    return json({
      total: total.value, living: living.value,
      deceased: deceased.value, deceased_unknown: deceasedUnknown.value,
      male: male.value, female: female.value,
      post80s: post80s.value, post90s: post90s.value, post00s: post00s.value,
      adopted: adopted.value, byGeneration, byGenerationLiving,
    });
  }

  // ── /api/members/* ──────────────────────────────────────────────────

  // GET /api/members/tree/all (must be checked BEFORE :id)
  if (pathname === '/api/members/tree/all' && method === 'GET') {
    const members = query(database, `
      SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
      FROM members m LEFT JOIN generations g ON m.generation_id = g.id
      ORDER BY m.generation_id, m.order_index
    `);
    const childrenRows = query(database, 'SELECT * FROM children ORDER BY father_id, child_order');

    const memberMap = {};
    members.forEach(m => {
      memberMap[m.id] = { ...m, spouse_info: JSON.parse(m.spouse_info || '[]'), children: [] };
    });
    childrenRows.forEach(c => {
      if (memberMap[c.father_id] && memberMap[c.child_id]) {
        memberMap[c.father_id].children.push(memberMap[c.child_id]);
      }
    });
    const roots = members.filter(m => m.generation_id === 17);
    return json(roots.map(r => memberMap[r.id]));
  }

  // GET /api/members
  if (pathname === '/api/members' && method === 'GET') {
    const members = query(database, `
      SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
      FROM members m LEFT JOIN generations g ON m.generation_id = g.id
      ORDER BY m.generation_id, m.order_index
    `);
    return json(members.map(m => ({ ...m, spouse_info: JSON.parse(m.spouse_info || '[]') })));
  }

  // POST /api/members
  if (pathname === '/api/members' && method === 'POST') {
    const body = await request.json();
    const {
      name, pai_name, generation_id, gender, father_id,
      birth_year, birth_month, birth_day, birth_hour, birth_minute,
      is_deceased, death_year, death_month, death_day, death_hour, death_minute,
      spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity,
    } = body;

    const maxOrder = get(database, 'SELECT COALESCE(MAX(order_index), 0) + 1 as next FROM members WHERE generation_id = ?', [generation_id]);
    const orderIndex = maxOrder?.next || 1;

    const sql = `INSERT INTO members (name, pai_name, generation_id, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, is_deceased, death_year, death_month, death_day, death_hour, death_minute, father_id, spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    database.run(sql, [
      name, pai_name || null, generation_id, gender || '男',
      birth_year ?? null, birth_month ?? null, birth_day ?? null, birth_hour ?? null, birth_minute ?? null,
      is_deceased || 0, death_year ?? null, death_month ?? null, death_day ?? null, death_hour ?? null, death_minute ?? null,
      father_id || null, JSON.stringify(spouse_info || []),
      notes || null, is_adopted || 0, adoption_note || null, is_shang || 0, has_posterity ?? 1,
      orderIndex,
    ]);

    const idResult = database.exec('SELECT last_insert_rowid() as id');
    const newId = idResult[0].values[0][0];

    if (father_id) {
      const maxChild = get(database, 'SELECT COALESCE(MAX(child_order), 0) + 1 as next FROM children WHERE father_id = ?', [father_id]);
      database.run('INSERT INTO children (father_id, child_id, child_order) VALUES (?, ?, ?)', [father_id, newId, maxChild?.next || 1]);
    }

    waitUntil(saveDb(database, env));

    const member = get(database, 'SELECT * FROM members WHERE id = ?', [newId]);
    member.spouse_info = JSON.parse(member.spouse_info || '[]');
    return json(member, 201);
  }

  // GET /api/members/:id/children
  if (segments.length === 5 && segments[3] === 'children' && method === 'GET') {
    const id = Number(segments[2]);
    const children = query(database, `
      SELECT m.*, c.child_order, g.number as gen_number, g.pai_zi as gen_pai_zi
      FROM members m JOIN children c ON m.id = c.child_id
      LEFT JOIN generations g ON m.generation_id = g.id
      WHERE c.father_id = ? ORDER BY c.child_order
    `, [id]);
    return json(children.map(m => ({ ...m, spouse_info: JSON.parse(m.spouse_info || '[]') })));
  }

  // GET /api/members/:id
  if (segments.length === 4 && method === 'GET') {
    const id = Number(segments[2]);
    const member = get(database, `
      SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
      FROM members m LEFT JOIN generations g ON m.generation_id = g.id
      WHERE m.id = ?
    `, [id]);
    if (!member) return error('Member not found', 404);
    member.spouse_info = JSON.parse(member.spouse_info || '[]');
    return json(member);
  }

  // PUT /api/members/:id
  if (segments.length === 4 && method === 'PUT') {
    const id = Number(segments[2]);
    const body = await request.json();
    const {
      name, pai_name, generation_id, gender,
      birth_year, birth_month, birth_day, birth_hour, birth_minute,
      is_deceased, death_year, death_month, death_day, death_hour, death_minute,
      spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity, avatar,
    } = body;

    const existing = get(database, 'SELECT avatar FROM members WHERE id = ?', [id]);
    if (!existing) return error('Member not found', 404);
    const finalAvatar = avatar !== undefined ? avatar : existing.avatar;

    database.run(
      `UPDATE members SET name=?, pai_name=?, generation_id=?, gender=?, birth_year=?, birth_month=?, birth_day=?, birth_hour=?, birth_minute=?, is_deceased=?, death_year=?, death_month=?, death_day=?, death_hour=?, death_minute=?, spouse_info=?, notes=?, is_adopted=?, adoption_note=?, is_shang=?, has_posterity=?, avatar=? WHERE id=?`,
      [
        name, pai_name || null, generation_id, gender || '男',
        birth_year ?? null, birth_month ?? null, birth_day ?? null, birth_hour ?? null, birth_minute ?? null,
        is_deceased || 0, death_year ?? null, death_month ?? null, death_day ?? null, death_hour ?? null, death_minute ?? null,
        JSON.stringify(spouse_info || []), notes || null,
        is_adopted || 0, adoption_note || null, is_shang || 0, has_posterity ?? 1,
        finalAvatar || null, id,
      ],
    );

    waitUntil(saveDb(database, env));

    const member = get(database, 'SELECT * FROM members WHERE id = ?', [id]);
    member.spouse_info = JSON.parse(member.spouse_info || '[]');
    return json(member);
  }

  // DELETE /api/members/:id
  if (segments.length === 4 && method === 'DELETE') {
    const id = Number(segments[2]);
    database.run('DELETE FROM children WHERE father_id = ?', [id]);
    database.run('DELETE FROM children WHERE child_id = ?', [id]);
    database.run('DELETE FROM members WHERE id = ?', [id]);
    waitUntil(saveDb(database, env));
    return json({ success: true });
  }

  // POST /api/lunar/convert
  if (pathname === '/api/lunar/convert' && method === 'POST') {
    const SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const DIZHI_HOURS = {
      '子': '23:00-1:00', '丑': '1:00-3:00', '寅': '3:00-5:00', '卯': '5:00-7:00',
      '辰': '7:00-9:00', '巳': '9:00-11:00', '午': '11:00-13:00', '未': '13:00-15:00',
      '申': '15:00-17:00', '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00',
    };
    function hourToDizhi(hour) {
      if (hour === null || hour === undefined) return '';
      if (hour >= 23 || hour < 1) return '子';
      if (hour < 3) return '丑'; if (hour < 5) return '寅'; if (hour < 7) return '卯';
      if (hour < 9) return '辰'; if (hour < 11) return '巳'; if (hour < 13) return '午';
      if (hour < 15) return '未'; if (hour < 17) return '申'; if (hour < 19) return '酉';
      if (hour < 21) return '戌'; return '亥';
    }

    const body = await request.json();
    const { year, month, day, hour, minute, type } = body;
    if (!year) return json({ text: '信息不全' });

    const dizhi = hourToDizhi(hour);
    const hourStr = dizhi ? `${dizhi}时` : '';
    const hourRange = DIZHI_HOURS[dizhi] || '';
    const shengXiao = SHENGXIAO[(year - 4) % 12];

    let solarStr = `${year}年`;
    if (month) solarStr += `${month}月`;
    if (day) solarStr += `${day}日`;
    if (hourRange) solarStr += ` ${hourRange}`;

    let lunarDateStr = '';
    if (month && day) {
      try {
        const { Solar } = await import('lunar-javascript');
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        lunarDateStr = `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}日`;
      } catch (e) {
        lunarDateStr = '';
      }
    }

    const prefix = type === 'birth' ? '生于' : '殁于';
    const lunarFull = lunarDateStr ? `农历${lunarDateStr}${hourStr}` : '';
    const solarFull = `阳历${solarStr}`;
    const combined = lunarFull ? `${lunarFull} → ${solarFull}` : `${prefix}公元${solarStr}`;

    return json({ text: combined, lunar: lunarDateStr, solar: solarStr, hour: hourStr, hourRange, shengXiao, combined });
  }

  // POST /api/upload-avatar
  if (pathname === '/api/upload-avatar' && method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('avatar');
      if (!file) return error('No file uploaded');

      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const url = `data:${file.type};base64,${base64}`;
      return json({ url });
    } catch (e) {
      return error('File upload failed: ' + e.message);
    }
  }

  return error('Not found', 404);
}

// ── Main entry ─────────────────────────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // API routes
  if (url.pathname.startsWith('/api/')) {
    try {
      const database = await loadDb(env);
      seedIfEmpty(database);
      return await handleApi(method, url.pathname, database, request, env, context.waitUntil);
    } catch (e) {
      console.error('API error:', e);
      return error('Internal server error: ' + e.message, 500);
    }
  }

  // Static assets & SPA fallback
  try {
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }
    return response;
  } catch {
    return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
  }
}
