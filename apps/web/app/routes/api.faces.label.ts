import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import type { Scene } from '@shared/types/scene'
import type { ActionFunctionArgs } from 'react-router'
import { getByVideoSource, updateMetadata } from '@shared/services/vectorDb'
import { addFaceLabelingJob } from '../../../background-jobs/src/services/faces'
import { FACES_DIR, KNOWN_FACES_FILE, PROCESSED_VIDEOS_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'

interface LabelFaceRequest {
  jsonFile: string
  faceId: string
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Method not allowed' }
  }

  const { faces, name } = (await request.json()) as { faces: LabelFaceRequest[]; name: string }
  const unknownFacesDir = UNKNOWN_FACES_DIR

  if (!faces || faces.length === 0) {
    return { success: false, error: 'No faces provided' }
  }

  if (!name || !name.trim()) {
    return { success: false, error: 'Name is required' }
  }

  const personDir = path.join(FACES_DIR, name)
  if (!existsSync(personDir)) {
    await fs.mkdir(personDir, { recursive: true })
  }

  let labeledCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    // Load existing known faces
    let knownFaces: Record<string, string[]> = {}
    if (existsSync(KNOWN_FACES_FILE)) {
      knownFaces = JSON.parse(await fs.readFile(KNOWN_FACES_FILE, 'utf-8'))
    }

    if (!knownFaces[name]) {
      knownFaces[name] = []
    }

    // Process each face
    for (const face of faces) {
      try {
        const jsonPath = path.join(unknownFacesDir, face.jsonFile)
        const faceData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'))
        const imageFile = faceData.image_file
        const imagePath = path.join(unknownFacesDir, imageFile)
        const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(faceData.video_path))

        const scenesPath = path.join(videoDir, 'scenes.json')

        // Update scenes in vector DB
        const scenes: Scene[] = await getByVideoSource(faceData.video_path)
        const modifiedScenes = scenes
          .map((scene) => {
            if (
              scene.startTime >= faceData.frame_start_time_ms / 1000 &&
              scene.endTime <= faceData.frame_end_time_ms / 1000
            ) {
              if (scene.faces.includes(face.faceId)) {
                scene.faces = scene.faces.map((f) => (f === face.faceId ? name : f))
                if (scene.facesData) {
                  scene.facesData = scene.facesData?.map((f) => (f.name === face.faceId ? { ...f, name } : f))
                }
                return scene
              }
            }
            return undefined
          })
          .filter((scene): scene is Scene => scene !== undefined)

        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }

        if (existsSync(scenesPath)) {
          const allScenes: Scene[] = JSON.parse(await fs.readFile(scenesPath, 'utf-8'))

          // Update the scenes in the array
          for (const scene of allScenes) {
            if (
              scene.startTime >= faceData.frame_start_time_ms / 1000 &&
              scene.endTime <= faceData.frame_end_time_ms / 1000
            ) {
              if (scene.faces.includes(face.faceId)) {
                scene.faces = scene.faces.map((f) => (f === face.faceId ? name : f))
                if (scene.facesData) {
                  scene.facesData = scene.facesData?.map((f) => (f.name === face.faceId ? { ...f, name } : f))
                }
                return scene
              }
            }
          }

          // Write back to scenes.json
          await fs.writeFile(scenesPath, JSON.stringify(allScenes, null, 2))
        }
        // Move image to person directory
        const newImagePath = path.join(personDir, imageFile)
        await fs.copyFile(imagePath, newImagePath)
        await fs.unlink(imagePath)

        // Add to known faces
        knownFaces[name].push(newImagePath)

        // // Delete JSON file
        await fs.unlink(jsonPath)

        labeledCount++
      } catch (error) {
        console.error(`Error labeling face ${face.faceId}:`, error)
        failedCount++
        errors.push(`Failed to label face ${face.faceId}`)
      }
    }

    // Save updated known faces
    await fs.writeFile(KNOWN_FACES_FILE, JSON.stringify(knownFaces, null, 2))

    // Trigger matching job once with all reference images
    if (labeledCount > 0) {
      const referenceImages = knownFaces[name]
      await addFaceLabelingJob({
        personName: name,
        referenceImages: referenceImages.slice(0, 10),
        unknownFacesDir,
      })
    }

    return {
      success: true,
      labeledCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Error labeling faces:', error)
    return { success: false, error: 'Failed to label faces' }
  }
}
