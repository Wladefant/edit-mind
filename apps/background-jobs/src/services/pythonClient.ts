import axios from 'axios';
import { config } from '../config.js';

export async function analyzeVideo(videoPath: string) {
  try {
    const res = await axios.post(`${config.pythonServiceUrl}/analyze`, { videoPath });
    return res.data;
  } catch (err) {
    console.error('Error calling Python service:', err);
    throw err;
  }
}
