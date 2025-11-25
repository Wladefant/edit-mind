import express from 'express'
import { videoStitcherQueue } from '../queue'
import { VideoStitcherJobData } from '@shared/types/stitcher'

const router = express.Router()

router.post('/', async (req, res) => {
  const { selectedSceneIds, messageId, chatId } = req.body as VideoStitcherJobData

  if (!selectedSceneIds || !messageId || !chatId) {
    return res.status(400).json({ error: 'selectedSceneIds, messageId, and chatId are required' })
  }

  try {
    await videoStitcherQueue.add('stitch-video', {
      selectedSceneIds,
      messageId,
      chatId,
    })

    res.json({
      message: 'Video stitching job queued',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to queue video stitching job' })
  }
})

export default router
