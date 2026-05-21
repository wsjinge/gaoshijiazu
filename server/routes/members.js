import { Router } from 'express';
import { query, get } from '../db-helpers.js';

const router = Router();

router.get('/', (req, res) => {
  const members = query(req.db, `
    SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
    FROM members m
    LEFT JOIN generations g ON m.generation_id = g.id
    ORDER BY m.generation_id, m.order_index
  `);
  res.json(members.map(m => ({ ...m, spouse_info: JSON.parse(m.spouse_info || '[]') })));
});

router.get('/:id', (req, res) => {
  const member = get(req.db, `
    SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
    FROM members m
    LEFT JOIN generations g ON m.generation_id = g.id
    WHERE m.id = ?
  `, [Number(req.params.id)]);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  member.spouse_info = JSON.parse(member.spouse_info || '[]');
  res.json(member);
});

router.post('/', (req, res) => {
  const {
    name, pai_name, generation_id, gender, father_id,
    birth_year, birth_month, birth_day, birth_hour, birth_minute,
    is_deceased, death_year, death_month, death_day, death_hour, death_minute,
    spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity
  } = req.body;

  const maxOrder = get(req.db, 'SELECT COALESCE(MAX(order_index), 0) + 1 as next FROM members WHERE generation_id = ?', [generation_id]);
  const orderIndex = maxOrder?.next || 1;

  // Insert using prepare/bind/step pattern
  const sql = `INSERT INTO members (name, pai_name, generation_id, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, is_deceased, death_year, death_month, death_day, death_hour, death_minute, father_id, spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const stmt = req.db.prepare(sql);
  stmt.bind([
    name, pai_name || null, generation_id, gender || '男',
    birth_year ?? null, birth_month ?? null, birth_day ?? null, birth_hour ?? null, birth_minute ?? null,
    is_deceased || 0, death_year ?? null, death_month ?? null, death_day ?? null, death_hour ?? null, death_minute ?? null,
    father_id || null,
    JSON.stringify(spouse_info || []),
    notes || null, is_adopted || 0, adoption_note || null, is_shang || 0, has_posterity ?? 1,
    orderIndex
  ]);
  stmt.step();
  stmt.free();

  // Get last insert id
  const idResult = req.db.exec('SELECT last_insert_rowid() as id');
  const newId = idResult[0].values[0][0];

  if (father_id) {
    const maxChildOrder = get(req.db, 'SELECT COALESCE(MAX(child_order), 0) + 1 as next FROM children WHERE father_id = ?', [father_id]);
    const cstmt = req.db.prepare('INSERT INTO children (father_id, child_id, child_order) VALUES (?, ?, ?)');
    cstmt.bind([father_id, newId, maxChildOrder?.next || 1]);
    cstmt.step();
    cstmt.free();
  }

  req.saveDb();
  const member = get(req.db, 'SELECT * FROM members WHERE id = ?', [newId]);
  member.spouse_info = JSON.parse(member.spouse_info || '[]');
  res.json(member);
});

router.put('/:id', (req, res) => {
  const {
    name, pai_name, generation_id, gender,
    birth_year, birth_month, birth_day, birth_hour, birth_minute,
    is_deceased, death_year, death_month, death_day, death_hour, death_minute,
    spouse_info, notes, is_adopted, adoption_note, is_shang, has_posterity, avatar
  } = req.body;

  const existing = get(req.db, 'SELECT avatar FROM members WHERE id = ?', [Number(req.params.id)]);
  const finalAvatar = avatar !== undefined ? avatar : existing?.avatar;

  const sql = `UPDATE members SET name=?, pai_name=?, generation_id=?, gender=?, birth_year=?, birth_month=?, birth_day=?, birth_hour=?, birth_minute=?, is_deceased=?, death_year=?, death_month=?, death_day=?, death_hour=?, death_minute=?, spouse_info=?, notes=?, is_adopted=?, adoption_note=?, is_shang=?, has_posterity=?, avatar=? WHERE id=?`;
  const stmt = req.db.prepare(sql);
  stmt.bind([
    name, pai_name || null, generation_id, gender || '男',
    birth_year ?? null, birth_month ?? null, birth_day ?? null, birth_hour ?? null, birth_minute ?? null,
    is_deceased || 0, death_year ?? null, death_month ?? null, death_day ?? null, death_hour ?? null, death_minute ?? null,
    JSON.stringify(spouse_info || []),
    notes || null, is_adopted || 0, adoption_note || null, is_shang || 0, has_posterity ?? 1,
    finalAvatar || null,
    Number(req.params.id)
  ]);
  stmt.step();
  stmt.free();

  req.saveDb();
  const member = get(req.db, 'SELECT * FROM members WHERE id = ?', [Number(req.params.id)]);
  member.spouse_info = JSON.parse(member.spouse_info || '[]');
  res.json(member);
});

router.delete('/:id', (req, res) => {
  const d1 = req.db.prepare('DELETE FROM children WHERE child_id = ?');
  d1.bind([Number(req.params.id)]);
  d1.step();
  d1.free();

  const d2 = req.db.prepare('DELETE FROM members WHERE id = ?');
  d2.bind([Number(req.params.id)]);
  d2.step();
  d2.free();

  req.saveDb();
  res.json({ success: true });
});

router.get('/:id/children', (req, res) => {
  const children = query(req.db, `
    SELECT m.*, c.child_order, g.number as gen_number, g.pai_zi as gen_pai_zi FROM members m
    JOIN children c ON m.id = c.child_id
    LEFT JOIN generations g ON m.generation_id = g.id
    WHERE c.father_id = ? ORDER BY c.child_order
  `, [Number(req.params.id)]);
  res.json(children.map(m => ({ ...m, spouse_info: JSON.parse(m.spouse_info || '[]') })));
});

router.get('/tree/all', (req, res) => {
  const members = query(req.db, `
    SELECT m.*, g.number as gen_number, g.pai_zi as gen_pai_zi
    FROM members m LEFT JOIN generations g ON m.generation_id = g.id
    ORDER BY m.generation_id, m.order_index
  `);
  const children = query(req.db, 'SELECT * FROM children ORDER BY father_id, child_order');

  const memberMap = {};
  members.forEach(m => {
    memberMap[m.id] = { ...m, spouse_info: JSON.parse(m.spouse_info || '[]'), children: [] };
  });
  children.forEach(c => {
    if (memberMap[c.father_id] && memberMap[c.child_id]) {
      memberMap[c.father_id].children.push(memberMap[c.child_id]);
    }
  });
  const roots = members.filter(m => m.generation_id === 17);
  res.json(roots.map(r => memberMap[r.id]));
});

export default router;
