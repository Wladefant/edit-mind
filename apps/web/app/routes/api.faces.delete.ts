import { type ActionFunctionArgs } from 'react-router'
import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return { success: false, error: 'Method not allowed' }
  }

  const { imageFile, jsonFile } = await request.json()
  const unknownFacesDir = path.join(process.cwd(), 'analysis_results', 'unknown_faces')
  const imagePath = path.join(unknownFacesDir, imageFile)
  const jsonPath = path.join(unknownFacesDir, jsonFile)

  try {
    if (existsSync(imagePath)) {
      await fs.unlink(imagePath)
    }
    if (existsSync(jsonPath)) {
      await fs.unlink(jsonPath)
    }
    return { success: true }
  } catch (error) {
    console.error('Error deleting unknown face:', error)
    return { success: false, error: 'Failed to delete face' }
  }
}
