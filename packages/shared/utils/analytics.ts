import { formatDuration } from 'date-fns'
import { generateActionFromPrompt } from '../services/gemini'
import { getVideoWithScenesBySceneIds, queryCollection } from '../services/vectorDb'

export async function getVideoAnalytics(prompt: string) {
  const faces = prompt?.match(/@(\w+)/g)?.map((name: string) => name.substring(1)) || []

  const { shot_type, emotions, description, aspect_ratio, objects, transcriptionQuery } =
    await generateActionFromPrompt(prompt)

  const results = await queryCollection({
    faces,
    shot_type,
    emotions,
    description,
    aspect_ratio,
    objects,
    transcriptionQuery,
  })

  const sceneIds = results.flatMap((result) => result.scenes.map((scene) => scene.id))
  const videosWithScenes = await getVideoWithScenesBySceneIds(sceneIds)

  const allScenes = videosWithScenes.flatMap((video) => video.scenes.filter((scene) => sceneIds.includes(scene.id)))

  const totalDuration = allScenes.reduce((sum, scene) => {
    const duration = scene.endTime - scene.startTime
    return sum + duration
  }, 0)

  const uniqueVideos = new Set(videosWithScenes.map((v) => v.source)).size
  const totalScenes = allScenes.length

  const dates = videosWithScenes.map((v) => new Date(v.createdAt)).sort((a, b) => a.getTime() - b.getTime())
  const oldestDate = dates[0]
  const newestDate = dates[dates.length - 1]

  const emotionCounts = allScenes.reduce(
    (acc, scene) => {
      scene.emotions?.forEach((emotion: string) => {
        acc[emotion] = (acc[emotion] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  // Get face occurrences
  const faceOccurrences = allScenes.reduce(
    (acc, scene) => {
      scene.faces?.forEach((face: string) => {
        acc[face] = (acc[face] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalDuration,
    totalDurationFormatted: formatDuration(totalDuration),
    uniqueVideos,
    totalScenes,
    dateRange:
      oldestDate && newestDate
        ? {
            oldest: oldestDate,
            newest: newestDate,
          }
        : null,
    emotionCounts,
    faceOccurrences,
    averageSceneDuration: totalScenes > 0 ? totalDuration / totalScenes : 0,
    sceneIds,
  }
}
