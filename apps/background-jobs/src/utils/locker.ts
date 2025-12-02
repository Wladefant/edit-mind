import { KNOWN_FACES_FILE } from '@shared/constants'
import { Scene } from '@shared/schemas'
import { logger } from '@shared/services/logger'
import { existsSync } from 'fs'
import { readFile, open, unlink, writeFile } from 'fs/promises'

const LOCK_FILE = KNOWN_FACES_FILE + '.lock'

export async function acquireLock(lockPath: string) {
  while (true) {
    try {
      // 'wx' = write + fail if exists → acts like a mutex
      await open(lockPath, 'wx')
      return
    } catch {
      // lock exists → wait and retry
      await new Promise((res) => setTimeout(res, 10))
    }
  }
}

async function releaseLock(lockPath: string) {
  try {
    await unlink(lockPath)
  } catch {
    /* ignore */
  }
}

export async function safeUpdateKnownFaces(personName: string, newImagePath: string) {
  await acquireLock(LOCK_FILE)

  try {
    let faces: Record<string, string[]> = {}

    try {
      const content = await readFile(KNOWN_FACES_FILE, 'utf-8')
      faces = JSON.parse(content)
    } catch {
      faces = {}
    }

    if (!faces[personName]) {
      faces[personName] = []
    }

    faces[personName].push(newImagePath)

    await writeFile(KNOWN_FACES_FILE, JSON.stringify(faces, null, 2))
  } finally {
    await releaseLock(LOCK_FILE)
  }
}

export async function safeUpdateScenesFile(
  scenesPath: string,
  faceId: string,
  personName: string,
  faceTimestamp: number
) {
  const lockPath = scenesPath + '.lock'
  await acquireLock(lockPath)

  try {
    if (!existsSync(scenesPath)) {
      logger.warn({ scenesPath }, 'Scenes file does not exist')
      return
    }

    const allScenes: Scene[] = JSON.parse(await readFile(scenesPath, 'utf-8'))

    // Update the scenes in the array
    let modified = false
    for (const scene of allScenes) {
      if (scene.startTime <= faceTimestamp && scene.endTime >= faceTimestamp) {
        if (scene.faces.includes(faceId)) {
          scene.faces = scene.faces.map((f) => (f === faceId ? personName : f))
          if (scene.facesData) {
            scene.facesData = scene.facesData?.map((f) => (f.name === faceId ? { ...f, name: personName } : f))
          }
          modified = true
          logger.debug({ sceneId: scene.id, faceId, personName }, 'Updated face in scenes.json')
        }
      }
    }

    if (modified) {
      await writeFile(scenesPath, JSON.stringify(allScenes, null, 2))
      logger.debug({ scenesPath }, 'scenes.json updated successfully')
    }
  } finally {
    await releaseLock(lockPath)
  }
}
