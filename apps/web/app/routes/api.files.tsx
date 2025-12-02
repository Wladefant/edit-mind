import pathModule from 'path'
import fs from 'fs/promises'
import { SUPPORTED_VIDEO_EXTENSIONS } from '@shared/constants'


export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || '/'

  try {
    const fullPath = pathModule.resolve(path)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })

    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        path: pathModule.join(fullPath, entry.name),
        name: entry.name,
        isDirectory: true,
      }))

    const videos = entries
      .filter((entry) => entry.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name))
      .map((entry) => ({
        path: pathModule.join(fullPath, entry.name),
        name: entry.name,
        isDirectory: false,
      }))

    return { folders: [...folders, ...videos] }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to read directory' }
  }
}

