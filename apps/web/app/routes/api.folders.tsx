import pathModule from 'path'
import fs from 'fs/promises'
import { prisma } from '~/services/database'
import { getUser } from '~/services/user.sever'
import { triggerFolderQueue } from '~/utils/folder.server'

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

    return { folders }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to read directory' }
  }
}

export async function action({ request }: { request: Request }) {
  try {
    const user = await getUser(request)
    const data = await request.json()
    const folderPath = data.path

    if (!user) {
      return { success: false, error: 'No user authenticated' }
    }

    if (!folderPath) {
      return { success: false, error: 'No path provided' }
    }

    const fullPath = pathModule.resolve(folderPath)

    
    try {
      await fs.access(fullPath)
      const folder = await prisma.folder.create({
        data: {
          path: folderPath,
          userId: user?.id,
        },
      })
      await triggerFolderQueue(folderPath)
      return { success: true, folder }
    } catch {
      return { success: false, error: 'Failed to create folder' }
    }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to create folder' }
  }
}
