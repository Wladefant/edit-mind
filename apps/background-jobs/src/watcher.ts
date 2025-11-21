import chokidar from 'chokidar'
import path from 'path'
import { videoQueue } from './queue.js'
import { prisma } from './services/db.js'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants/index'

export function watchFolder(folderPath: string) {
  const watcher = chokidar.watch(folderPath, { ignored: /^\./, persistent: true, ignoreInitial: true })

  watcher.on('add', async (filePath) => {
    try {
      if (!SUPPORTED_VIDEO_EXTENSIONS.test(filePath)) return

      const folder = await prisma.folder.findFirst({
        where: {
          path: path.dirname(filePath),
        },
      })

      if (!folder) return

      const job = await prisma.job.create({
        data: { videoPath: filePath, userId: folder.userId, folderId: folder.id },
      })
      await videoQueue.add('index-video', { videoPath: filePath, jobId: job.id, folderId: folder.id })
    } catch (error) {
      console.error('Error adding new video file while watching for new folder changes: ', error)
    }
  })
}
