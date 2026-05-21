import { Router } from 'express';
import { get, query } from '../db-helpers.js';

const router = Router();

router.get('/', (req, res) => {
  const total = get(req.db, 'SELECT COUNT(*) as value FROM members');
  const living = get(req.db, 'SELECT COUNT(*) as value FROM members WHERE is_deceased = 0');
  const deceased = get(req.db, "SELECT COUNT(*) as value FROM members WHERE is_deceased = 1 AND death_year IS NOT NULL");
  const deceasedUnknown = get(req.db, "SELECT COUNT(*) as value FROM members WHERE is_deceased = 1 AND death_year IS NULL");
  const male = get(req.db, "SELECT COUNT(*) as value FROM members WHERE gender = '男'");
  const female = get(req.db, "SELECT COUNT(*) as value FROM members WHERE gender = '女'");
  const post80s = get(req.db, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 1980 AND birth_year < 1990');
  const post90s = get(req.db, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 1990 AND birth_year < 2000');
  const post00s = get(req.db, 'SELECT COUNT(*) as value FROM members WHERE birth_year >= 2000');
  const adopted = get(req.db, 'SELECT COUNT(*) as value FROM members WHERE is_adopted = 1');

  const byGenerationLiving = query(req.db, `
    SELECT g.number as generation, g.pai_zi,
      SUM(CASE WHEN m.is_deceased = 0 THEN 1 ELSE 0 END) as living,
      SUM(CASE WHEN m.is_deceased = 1 AND m.death_year IS NOT NULL THEN 1 ELSE 0 END) as deceased,
      SUM(CASE WHEN m.is_deceased = 1 AND m.death_year IS NULL THEN 1 ELSE 0 END) as deceased_unknown
    FROM members m
    JOIN generations g ON m.generation_id = g.id
    GROUP BY g.number, g.pai_zi
    ORDER BY g.number
  `);

  const byGeneration = query(req.db, `
    SELECT g.number as generation, g.pai_zi, COUNT(*) as count
    FROM members m
    JOIN generations g ON m.generation_id = g.id
    GROUP BY g.number, g.pai_zi
    ORDER BY g.number
  `);

  res.json({
    total: total.value,
    living: living.value,
    deceased: deceased.value,
    deceased_unknown: deceasedUnknown.value,
    male: male.value,
    female: female.value,
    post80s: post80s.value,
    post90s: post90s.value,
    post00s: post00s.value,
    adopted: adopted.value,
    byGeneration,
    byGenerationLiving,
  });
});

export default router;
