import chokidar from 'chokidar'
import path from 'path'
import { videoQueue } from './queue.js'
import { db } from './services/db.js'

export function watchFolder(folderPath: string) {
  const watcher = chokidar.watch(folderPath, { ignored: /^\./, persistent: true })

  watcher.on('add', async (filePath) => {
    if (isVideoFile(filePath)) {
      console.log('New video detected:', filePath)
      await db.job.upsert({
        where: { videoPath: filePath, id: '' },
        create: { videoPath: filePath },
        update: {},
      })
      await videoQueue.add('index-video', { videoPath: filePath })
    }
  })

  console.log(`Watching folder: ${folderPath}`)
}

function isVideoFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  return ['.mp4', '.mov', '.mkv', '.avi'].includes(ext)
}
