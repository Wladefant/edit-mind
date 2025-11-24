import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import { FACES_DIR } from '@shared/constants'

export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    const decodedPath = path.join(FACES_DIR, decodeURIComponent(filePath))

    if (!fs.existsSync(decodedPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(decodedPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const contentType = getContentType(decodedPath)
    const fileBuffer = fs.readFileSync(decodedPath)

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
  } catch {
    throw new Response('File not found or error loading media', { status: 404 })
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }
  return types[ext] || 'application/octet-stream'
}
