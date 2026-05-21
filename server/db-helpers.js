export function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function get(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let result = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  return result;
}

export function run(db, sql, params = []) {
  db.run(sql, params);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid = result[0]?.values[0]?.[0];
  return { lastInsertRowid };
}
