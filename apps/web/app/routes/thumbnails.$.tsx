import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path, { join } from 'path'

export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''

  if (!filePath) {
    throw new Response('No file path provided', { status: 400 })
  }

  try {
    const decodedPath = decodeURIComponent(filePath)
    const thumbnailPath = join(decodedPath)

    if (!fs.existsSync(thumbnailPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(thumbnailPath)

    if (!stats.isFile()) {
      throw new Response('Not a file', { status: 400 })
    }

    const contentType = getContentType(thumbnailPath)

    const fileBuffer = fs.readFileSync(thumbnailPath)

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error loading media:', error)
    throw new Response(`File not found or error loading media: ${error}`, { status: 404 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.webm': 'video/webm',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpg',
  }
  return contentTypes[ext] || 'application/octet-stream'
}
