import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { db } from '../services/db.js';
import { watchFolder } from '../watcher.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const folders = fs.readdirSync(config.mediaPath)
    .filter(f => fs.lstatSync(path.join(config.mediaPath, f)).isDirectory());
  res.json(folders);
});

router.post('/add', async (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' });

  const folder = await db.folder.upsert({
    where: { path: folderPath },
    create: { path: folderPath },
    update: {},
  });

  watchFolder(folderPath);

  res.json({ message: 'Folder added and being watched', folder });
});

export default router;
