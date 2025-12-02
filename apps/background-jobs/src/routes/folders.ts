import express from 'express'
import { prisma } from '../services/db'
import { findVideoFiles } from '@shared/utils/videos';
import { watchFolder } from '../watcher'
import { videoQueue } from 'src/queue'
import { getVideosNotEmbedded } from '@shared/services/vectorDb';

const router = express.Router()

router.post('/trigger', async (req, res) => {
  const { folderPath } = req.body
  if (!folderPath) return res.status(400).json({ error: 'folderPath required' })

  try {
    const videos = await findVideoFiles(folderPath)
    const uniqueVideos = await getVideosNotEmbedded(videos.map((video) => video.path))
    const folder = await prisma.folder.update({
      where: { path: folderPath },
      data: {
        videoCount: uniqueVideos.length,
        lastScanned: new Date(),
      },
    })

    watchFolder(folderPath)

    for (const video of uniqueVideos) {
      const job = await prisma.job.upsert({
        where: { videoPath: video, id: '' },
        create: {
          videoPath: video,
          userId: folder?.userId,
          folderId: folder.id,
        },
        update: { folderId: folder.id},
      })
      await videoQueue.add('index-video', { videoPath: video, jobId: job.id, folderId: folder.id })
    }

    res.json({
      message: 'Folder added and videos queued for processing',
      folder,
      queuedVideos: uniqueVideos.length,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to process folder' })
  }
})

export default router
