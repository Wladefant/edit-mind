import type { LoaderFunctionArgs } from 'react-router'
import fs from 'fs'
import path from 'path'
import { getCache, setCache } from '@shared/services/cache'
import crypto from 'crypto'

interface CachedFileMetadata {
  contentType: string
  size: number
  etag: string
  lastModified: number
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const filePath = params['*'] || ''
  if (!filePath) throw new Response('No file path provided', { status: 400 })

  try {
    const decodedPath = path.normalize(decodeURIComponent(filePath))

    if (!fs.existsSync(decodedPath)) {
      throw new Response('File not found', { status: 404 })
    }

    const stats = fs.statSync(decodedPath)
    if (!stats.isFile()) throw new Response('Not a file', { status: 400 })

    const cacheKey = `file:${decodedPath}:${stats.mtimeMs}`
    const metadataCacheKey = `file:metadata:${decodedPath}`

    const cachedMetadata = await getCache<CachedFileMetadata>(metadataCacheKey)
    const requestEtag = request.headers.get('if-none-match')

    if (cachedMetadata && requestEtag === cachedMetadata.etag) {
      return new Response(null, { status: 304 })
    }

    const contentType = getContentType(decodedPath)

    // For images and small files, cache the buffer in Redis
    const MAX_REDIS_SIZE = 5 * 1024 * 1024 // 5MB max for Redis

    if (stats.size <= MAX_REDIS_SIZE) {
      const cachedBuffer = await getCache<string>(cacheKey)

      if (cachedBuffer) {
        console.debug('Cache hit for file:', decodedPath)
        const buffer = Buffer.from(cachedBuffer, 'base64')
        const uint8Array = new Uint8Array(buffer)

        return new Response(uint8Array, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': stats.size.toString(),
            'Cache-Control': 'public, max-age=86400', // 24 hours
            ETag: cachedMetadata?.etag || generateEtag(decodedPath, stats),
          },
        })
      }

      const fileBuffer = fs.readFileSync(decodedPath)
      const base64Buffer = fileBuffer.toString('base64')
      const etag = generateEtag(decodedPath, stats)

      // Cache the file buffer (TTL: 1 hour for images)
      await setCache(cacheKey, base64Buffer, 3600)

      await setCache<CachedFileMetadata>(
        metadataCacheKey,
        {
          contentType,
          size: stats.size,
          etag,
          lastModified: stats.mtimeMs,
        },
        7200 // 2 hours
      )

      const uint8Array = new Uint8Array(fileBuffer)

      return new Response(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          ETag: etag,
        },
      })
    }

    const fileBuffer = fs.readFileSync(decodedPath)
    const uint8Array = new Uint8Array(fileBuffer)
    const etag = generateEtag(decodedPath, stats)

    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=86400', // 1 day
        ETag: etag,
      },
    })
  } catch {
    throw new Response('File not found', { status: 404 })
  }
}

function generateEtag(filePath: string, stats: fs.Stats): string {
  const hash = crypto.createHash('md5')
  hash.update(`${filePath}-${stats.size}-${stats.mtimeMs}`)
  return `"${hash.digest('hex')}"`
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }
  return types[ext] || 'application/octet-stream'
}
