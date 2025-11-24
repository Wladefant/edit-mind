import { prisma } from '~/services/database'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { findJobsByFolderId } from '@background-jobs/src/utils/jobs'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) return { success: false, error: 'No folder id provided' }

  try {
    const folder = await prisma.folder.findUnique({
      where: { id },
    })
    if (!folder) return { success: false, error: 'Folder not found' }

    return { success: true, folder }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to load folder' }
  }
}

export async function action({ params }: ActionFunctionArgs) {
  const { id } = params
  if (!id) return { success: false, error: 'No folder id provided' }

  try {
    const jobsToDelete = await findJobsByFolderId(id)

    for (const job of jobsToDelete) {
      try {
        await job.remove()
      } catch (error) {
        console.error(error)
      }
    }

    const folder = await prisma.folder.delete({
      where: { id },
    })
    return { success: true, folder }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to delete folder' }
  }
}
