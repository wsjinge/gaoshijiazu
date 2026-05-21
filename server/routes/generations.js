import { Router } from 'express';
import { query } from '../db-helpers.js';

const router = Router();

router.get('/', (req, res) => {
  const gens = query(req.db, 'SELECT * FROM generations ORDER BY number');
  res.json(gens);
});

export default router;
