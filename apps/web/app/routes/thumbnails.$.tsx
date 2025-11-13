import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'

export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    const decodedPath = decodeURIComponent(filePath)

    const thumbnailsDir = process.env.THUMBNAILS_PATH || '/.thumbnails'

    const safePath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
    const thumbnailPath = path.join(thumbnailsDir, safePath)

    if (!fs.existsSync(thumbnailPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(thumbnailPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const contentType = getContentType(thumbnailPath)
    const fileBuffer = fs.readFileSync(thumbnailPath)

    const uint8Array = new Uint8Array(fileBuffer)

    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error(error)
    throw new Response(`File not found or error loading media: ${error}`, { status: 404 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.webm': 'video/webm',
  }
  return types[ext] || 'application/octet-stream'
}
