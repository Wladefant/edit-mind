import { type App, dialog, shell, type WebContents } from 'electron'
import { handle, sender } from '@/lib/main/shared'
import { findVideoFiles, generateThumbnail, PROCESSED_VIDEOS_DIR, THUMBNAILS_DIR } from '@/lib/utils/videos'
import path from 'path'
import fs from 'fs/promises'
import { transcribeAudio } from '@/lib/utils/transcribe'
import { analyzeVideo } from '@/lib/utils/frameAnalyze'
import { createScenes } from '@/lib/utils/scenes'
import { existsSync, mkdirSync } from 'fs'
import { embedScenes } from '@/lib/utils/embed'
import { Scene } from '@/lib/types/scene'
import { generateSearchSuggestions } from '@/lib/utils/search'
import { getAllVideosWithScenes, queryCollection } from '@/lib/services/vectorDb'
import { generateActionFromPrompt } from '@/lib/services/gemini'
import { stitchVideos } from '@/lib/utils/sticher'
import { exportToFcpXml } from '@/lib/utils/fcpxml'

export const registerAppHandlers = (app: App, webContents: WebContents) => {
  const send = sender(webContents)
  handle('version', () => app.getVersion())
  handle('selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled) {
      return null
    }
    const folderPath = result.filePaths[0]
    const videos = await findVideoFiles(folderPath)
    return { folderPath, videos }
  })
  handle('searchDocuments', async (prompt) => {
    try {
      const faces = prompt?.match(/@(\w+)/g)?.map((name: string) => name.substring(1)) || []

      const { shot_type, emotions, description, aspect_ratio, objects, duration, camera } =
        await generateActionFromPrompt(prompt)

      const results = await queryCollection({
        faces,
        shot_type,
        emotions,
        description,
        aspect_ratio,
        objects,
        camera,
      })
      return { results, duration, aspect_ratio, faces }
    } catch (e) {
      console.error('Failed to search documents:', e)
      throw e
    }
  })

  handle('getAllVideos', async () => {
    try {
      const videos = await getAllVideosWithScenes()
      return videos
    } catch (e) {
      console.error('Failed to get all scenes:', e)
      throw e
    }
  })

  handle('stitchVideos', async (scenes, outputPath, aspectRatio, _duration, fps) => {
    await stitchVideos(scenes, outputPath, '1920x1080', aspectRatio, fps)
  })

  handle('exportToFcpXml', async (scenes, prompt, outputFilename) => {
    const outputDir = path.join(process.cwd(), 'output-videos')
    await fs.mkdir(outputDir, { recursive: true })
    const finalJsonPath = path.join(outputDir, `${outputFilename}.json`)
    const finalXmlPath = path.join(outputDir, `${outputFilename}`)

    await fs.writeFile(finalJsonPath, JSON.stringify({ scenes, prompt }, null, 2))

    await exportToFcpXml(finalJsonPath, finalXmlPath)
  })
  handle('generateSearchSuggestions', async (metadata) => {
    try {
      const suggestions = await generateSearchSuggestions(metadata)
      return suggestions
    } catch (error) {
      console.error('Error in generate-search-suggestions handler:', error)
      throw error
    }
  })

  handle('openFile', async (filename: string) => {
    try {
      const outputPath = path.join(process.cwd(), 'output-videos', filename)

      if (!existsSync(outputPath)) {
        throw new Error(`File not found: ${outputPath}`)
      }

      await shell.openPath(outputPath)
      return { success: true }
    } catch (error) {
      console.error('Error opening file:', error)
      throw error
    }
  })

  handle('showInFolder', (filename: string) => {
    try {
      const outputPath = path.join(process.cwd(), 'output-videos', filename)

      if (!existsSync(outputPath)) {
        throw new Error(`File not found: ${outputPath}`)
      }

      shell.showItemInFolder(outputPath)
      return { success: true }
    } catch (error) {
      console.error('Error showing in folder:', error)
      throw error
    }
  })

  handle('startIndexing', async (videos) => {
    for (const video of videos) {
      const thumbnailName = `${path.basename(video)}.jpg`
      const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName)
      const thumbnailUrl = `thumbnail://${thumbnailName}`
      if (!existsSync(path.resolve(PROCESSED_VIDEOS_DIR))) {
        mkdirSync(path.resolve(PROCESSED_VIDEOS_DIR))
      }

      const videoName = path.basename(video)
      const videoDir = path.join(PROCESSED_VIDEOS_DIR, videoName)
      if (!existsSync(videoDir)) {
        mkdirSync(path.resolve(videoDir))
      }
      const transcriptionPath = path.join(videoDir, 'transcription.json')
      const analysisPath = path.join(videoDir, 'analysis.json')
      const scenesPath = path.join(videoDir, 'scenes.json')

      // Check which files already exist
      const transcriptionExists = existsSync(transcriptionPath)
      const analysisExists = existsSync(analysisPath)
      const scenesExists = existsSync(scenesPath)

      try {
        await generateThumbnail(video, thumbnailPath, 1)

        if (scenesExists && transcriptionExists && analysisExists) {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'transcription',
            success: true,
            stepIndex: 0,
            thumbnailUrl,
          })
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'frame-analysis',
            success: true,
            stepIndex: 1,
            thumbnailUrl,
          })

          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'embedding',
              success: true,
              stepIndex: 2,
              thumbnailUrl,
            })
            const [scenes, { category }] = await Promise.all([
              fs.readFile(scenesPath, 'utf-8').then(JSON.parse),
              fs.readFile(analysisPath, 'utf-8').then(JSON.parse),
            ])

            await embedScenes(scenes, video, videoName, category)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'embedding',
              success: true,
              stepIndex: 2,
              thumbnailUrl,
            })
          } catch (error) {
            console.error(error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'embedding',
              success: false,
              stepIndex: 2,
              thumbnailUrl,
            })
          }
          continue
        }

        if (!transcriptionExists) {
          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'transcription',
              success: true,
              stepIndex: 0,
              thumbnailUrl,
            })

            const transcriptionResult = await transcribeAudio(video)
            if (transcriptionResult?.path) {
              await fs.copyFile(transcriptionResult.path, transcriptionPath)
              await fs.unlink(transcriptionResult.path)
            }
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'transcription',
              success: true,
              stepIndex: 0,
              thumbnailUrl,
            })
          } catch (error) {
            console.error(error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'transcription',
              success: false,
              stepIndex: 0,
              thumbnailUrl,
            })
            continue
          }
        } else {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'transcription',
            success: true,
            stepIndex: 0,
            thumbnailUrl,
          })
        }

        if (!analysisExists) {
          try {
            send('indexing-progress', {
              video,
              progress: 0,
              step: 'frame-analysis',
              success: true,
              stepIndex: 1,
              thumbnailUrl,
            })

            const { analysis, category } = await analyzeVideo(video)
            await fs.writeFile(analysisPath, JSON.stringify({ analysis, category }, null, 2))
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'frame-analysis',
              success: true,
              stepIndex: 1,
              thumbnailUrl,
            })
          } catch (error) {
            console.error(error)
            send('indexing-progress', {
              video,
              progress: 100,
              step: 'frame-analysis',
              success: false,
              stepIndex: 1,
              thumbnailUrl,
            })
            continue
          }
        } else {
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'frame-analysis',
            success: true,
            stepIndex: 1,
            thumbnailUrl,
          })
        }

        try {
          send('indexing-progress', {
            video,
            progress: 0,
            step: 'embedding',
            success: true,
            stepIndex: 2,
            thumbnailUrl,
          })

          const [transcriptionData, { analysis, category }] = await Promise.all([
            fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse),
            fs.readFile(analysisPath, 'utf-8').then(JSON.parse),
          ])

          let scenes: Scene[]
          if (!scenesExists) {
            scenes = createScenes(analysis, transcriptionData)
            await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
          } else {
            scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)
          }

          await embedScenes(scenes, video, videoName, category)
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'embedding',
            success: true,
            stepIndex: 2,
            thumbnailUrl,
          })
        } catch (error) {
          console.error(error)
          send('indexing-progress', {
            video,
            progress: 100,
            step: 'embedding',
            success: false,
            stepIndex: 2,
            thumbnailUrl,
          })
          continue
        }
      } catch (error) {
        console.error(error)
        send('indexing-progress', {
          video,
          progress: 100,
          step: 'transcription',
          success: false,
          stepIndex: 0,
          thumbnailUrl,
        })
        continue
      }
    }
  })
}
