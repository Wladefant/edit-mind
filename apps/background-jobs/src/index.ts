import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import foldersRoute from './routes/folders.js';
import { initDB } from './services/db.js';
import { config } from './config.js';
import './jobs/videoIndexer.js'; 

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/folders', foldersRoute);

app.get('/', (_req, res) => res.send('Background job service running'));

initDB().then(() => {
  app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
});
