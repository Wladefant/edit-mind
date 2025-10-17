import { Analysis, DetectedObject, Face } from '../types/analysis'
import { Scene } from '../types/scene'
import { Transcription } from '../types/transcription'

export const generateSceneDescription = (objects: DetectedObject[], faces: Face[]): string => {
  const objectCounts: Record<string, number> = {}
  for (const obj of objects) {
    objectCounts[obj.label] = (objectCounts[obj.label] || 0) + 1
  }

  if (faces.length > 0 && objectCounts['person']) {
    delete objectCounts['person']
  }

  const descriptionParts: string[] = []

  for (const [obj, count] of Object.entries(objectCounts)) {
    if (count > 1) {
      const pluralObj = obj.endsWith('s') ? obj : `${obj}s`
      descriptionParts.push(`${count} ${pluralObj}`)
    } else {
      descriptionParts.push(`a ${obj}`)
    }
  }

  if (faces.length > 0) {
    if (faces.length === 1) {
      descriptionParts.push('a person')
    } else {
      descriptionParts.push(`${faces.length} people`)
    }
  }

  if (descriptionParts.length === 0) {
    return 'No objects or people detected.'
  }

  let description: string
  if (descriptionParts.length > 1) {
    description = descriptionParts.slice(0, -1).join(', ') + ` and ${descriptionParts[descriptionParts.length - 1]}`
  } else {
    description = descriptionParts[0]
  }

  return `A scene with ${description}.`
}

export const createScenes = (analysis: Analysis, transcription: Transcription | null): Scene[] => {
  const scenes: Scene[] = []

  const transcriptionMap = new Map<number, string[]>()
  if (transcription?.segments) {
    for (const segment of transcription.segments) {
      for (const word of segment.words) {
        const timeKey = Math.floor(word.start)
        if (!transcriptionMap.has(timeKey)) {
          transcriptionMap.set(timeKey, [])
        }
        transcriptionMap.get(timeKey)!.push(word.word)
      }
    }
  }

  for (const frame of analysis.frame_analysis) {
    const startTime = frame.start_time_ms / 1000
    const endTime = frame.end_time_ms / 1000

    const sceneWords: string[] = []
    if (transcriptionMap.size > 0) {
      for (let t = Math.floor(startTime); t <= Math.ceil(endTime); t++) {
        const words = transcriptionMap.get(t)
        if (words) sceneWords.push(...words)
      }
    }

    const currentScene: Scene = {
      id: 'scene',
      startTime,
      endTime,
      objects: frame.objects.map((obj: DetectedObject) => obj.label),
      faces: frame.faces.map((face: Face) => face.name),
      transcription: sceneWords.join(' '),
      description: generateSceneDescription(frame.objects, frame.faces),
      shot_type: frame.shot_type,
      emotions: [],
      source: '',
      camera: '',
      createdAt: '',
    }

    scenes.push(currentScene)
  }

  return scenes
}
