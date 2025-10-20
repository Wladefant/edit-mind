import { protocol, net } from 'electron'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import fs from 'fs'
import { THUMBNAILS_DIR } from './shared'
const UNKNOWN_FACES_DIR = resolve('analysis_results/unknown_faces')
export function registerThumbnailProtocol() {
  protocol.handle('thumbnail', (request) => {
    const url = request.url.split('thumbnail://')[1]
    const thumbnailPath = join(THUMBNAILS_DIR, url)

    if (fs.existsSync(thumbnailPath)) {
      return net.fetch(pathToFileURL(thumbnailPath).toString())
    } else {
      const fallbackPath = join(__dirname, '../../app/assets/default-fallback-image.png')
      return net.fetch(pathToFileURL(fallbackPath).toString())
    }
  })
}

export function registerFaceProtocol() {
  protocol.handle('face', (request) => {
    const url = request.url.split('face://')[1]
    const imagePath = url

    if (fs.existsSync(imagePath)) {
      return net.fetch(pathToFileURL(imagePath).toString())
    } else {
      const fallbackPath = join(__dirname, '../../app/assets/default-fallback-image.png')
      return net.fetch(pathToFileURL(fallbackPath).toString())
    }
  })
}
export function registerUnknownFaceProtocol() {
  protocol.handle('unknown', (request) => {
    const url = request.url.split('unknown://')[1]
    const imagePath = join(UNKNOWN_FACES_DIR, url)

    if (fs.existsSync(imagePath)) {
      return net.fetch(pathToFileURL(imagePath).toString())
    } else {
      const fallbackPath = join(__dirname, '../../app/assets/default-fallback-image.png')
      return net.fetch(pathToFileURL(fallbackPath).toString())
    }
  })
}

export function registerResourcesProtocol() {
  protocol.handle('res', async (request) => {
    try {
      const url = new URL(request.url)
      // Combine hostname and pathname to get the full path
      const fullPath = join(url.hostname, url.pathname.slice(1))
      const filePath = join(__dirname, '../../resources', fullPath)
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (error) {
      console.error('Protocol error:', error)
      return new Response('Resource not found', { status: 404 })
    }
  })
}
