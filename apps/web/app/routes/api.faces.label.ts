import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import type { Scene } from '@shared/types/scene'
import type { ActionFunctionArgs } from 'react-router'
import { getByVideoSource, updateMetadata } from '@shared/services/vectorDb'
import { addFaceLabelingJob } from '../../../background-jobs/src/services/faces'
import { UNKNOWN_FACES_DIR } from '@shared/constants'

const FACES_DIR = '.faces'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }

  const { jsonFile, faceId, name } = await request.json()
  const unknownFacesDir = UNKNOWN_FACES_DIR
  const jsonPath = path.join(unknownFacesDir, jsonFile)

  try {
    const faceData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
    const imageFile = faceData.image_file
    const imagePath = path.join(unknownFacesDir, imageFile)

    const facesDir = path.join(process.cwd(), FACES_DIR)
    const personDir = path.join(facesDir, name)
    if (!existsSync(personDir)) {
      await fs.mkdir(personDir, { recursive: true })
    }

    const scenes: Scene[] = await getByVideoSource(faceData.video_path)
    const modifiedScenes = scenes
      .map((scene) => {
        if (
          scene.startTime >= faceData.frame_start_time_ms / 1000 &&
          scene.endTime <= faceData.frame_end_time_ms / 1000
        ) {
          if (scene.faces.includes(faceId)) {
            scene.faces = scene.faces.map((face) => (face === faceId ? name : face))
            return scene
          }
        }
        return undefined
      })
      .filter((scene): scene is Scene => scene !== undefined)

    for (const scene of modifiedScenes) {
      await updateMetadata(scene)
    }

    const newImagePath = path.join(personDir, imageFile)
    await fs.rename(imagePath, newImagePath)
    const facesJsonPath = '/app/apps/background-jobs/.faces.json'

    let faces: Record<string, string[]> = {}
    if (existsSync(facesJsonPath)) {
      faces = JSON.parse(await fs.readFile(facesJsonPath, 'utf-8'))
    }

    if (!faces[name]) {
      faces[name] = []
    }
    const relativePath = path.join(path.basename(FACES_DIR), name, path.basename(newImagePath))
    faces[name].push(relativePath)

    await fs.writeFile(facesJsonPath, JSON.stringify(faces, null, 2))

    await fs.unlink(jsonPath)

    const referenceImages = faces[name].map((img) => path.join(process.cwd(), img))

    await addFaceLabelingJob({
      personName: name,
      referenceImages,
      unknownFacesDir,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error labeling face:', error)
    return { success: false, error: 'Failed to label face' }
  }
}
