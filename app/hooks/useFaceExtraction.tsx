import type { FaceData, LoadedFaces } from '@/lib/types/search'
import { Video } from '@/lib/types/video'
import { useMemo } from 'react'

const isUnknownFace = (faceName: string): boolean => {
  return faceName.toLowerCase().includes('unknown')
}
const FACE_PROTOCOL = 'face://' as const

const getFirstFaceImage = (name: string, loadedFaces: LoadedFaces): string | null => {
  const lowercasedName = name.toLowerCase()
  const foundKey = Object.keys(loadedFaces).find((key) => key.toLowerCase() === lowercasedName)

  if (foundKey && loadedFaces[foundKey]?.length > 0) {
    return loadedFaces[foundKey][0]
  }

  return null
}
export const useFaceExtraction = (videos: Video[], loadedFaces: LoadedFaces): FaceData[] => {
  return useMemo(() => {
    const faceMap = new Map<string, FaceData>()

    for (const video of videos) {
      if (!video.scenes?.length) continue

      for (const scene of video.scenes) {
        if (!scene.faces?.length) continue

        for (const faceName of scene.faces) {
          if (isUnknownFace(faceName)) continue

          const existing = faceMap.get(faceName)

          if (existing) {
            existing.count++
          } else {
            const thumbnail = getFirstFaceImage(faceName.toLowerCase(), loadedFaces)
            faceMap.set(faceName, {
              name: faceName,
              count: 1,
              thumbnail: thumbnail ? `${FACE_PROTOCOL}${thumbnail}` : undefined,
            })
          }
        }
      }
    }

    return Array.from(faceMap.values()).sort((a, b) => b.count - a.count)
  }, [videos, loadedFaces])
}
