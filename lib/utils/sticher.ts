import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

export async function stitchVideos(
  scenes: { source: string; startTime: number; endTime: number }[],
  outputFileName: string,
  aspectRatio: string = '16:9',
  targetFps: number = 30
): Promise<string> {
  const targetResolution = '1920x1080'
  const outputDir = path.resolve('output-videos')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const outputPath = path.join(outputDir, outputFileName)

  const fileListPath = path.join(outputDir, 'file-list.txt')
  let fileContent = ''

  let targetWidth: number
  let targetHeight: number

  const [resW, resH] = targetResolution.split('x').map(Number)
  const [arNum, arDen] = aspectRatio.split(':').map(Number)

  if (resW && resH) {
    targetWidth = resW
    targetHeight = resH
  } else {
    // Default to a 1080p height for 16:9, or width for 9:16, and calculate the other dimension
    if (arNum / arDen >= 1) {
      // Landscape (e.g., 16:9) - target a standard height
      targetHeight = 1080
      targetWidth = Math.round(targetHeight * (arNum / arDen))
    } else {
      // Portrait (e.g., 9:16) - target a standard width
      targetWidth = 1080 
      targetHeight = Math.round(targetWidth * (arDen / arNum))
    }
  }

  // Ensure targetWidth and targetHeight are even, as FFmpeg often requires this
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1

  const clips: string[] = []
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const clipPath = path.join(outputDir, `clip_${i}.mp4`).toString()
    clips.push(clipPath)
    fileContent += `file '${clipPath}'\n`

    await new Promise<void>((resolve, reject) => {
      const baseFfmpegArgs = [
        '-ss',
        scene.startTime.toString(),
        '-to',
        scene.endTime.toString(),
        '-i',
        scene.source,
        '-vf',
        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${targetFps}`,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-pix_fmt',
        'yuv420p',
        '-y',
        clipPath,
      ]

      const ffmpeg = spawn('ffmpeg', [
        ...baseFfmpegArgs.slice(0, 10),
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?', 
        ...baseFfmpegArgs.slice(10),
      ])

      ffmpeg.stderr.on('data', (data) => console.error(`ffmpeg stderr (initial): ${data}`))

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          console.warn(`Initial ffmpeg command failed for ${scene.source}, trying with silent audio generation.`)
          // Retry attempt: Generate silent audio track if original failed
          const ffmpegRetry = spawn('ffmpeg', [
            ...baseFfmpegArgs.slice(0, 7), // Up to -vf
            // Insert specific audio generation for silent track
            '-f',
            'lavfi',
            '-i',
            'anullsrc=r=48000:cl=stereo',
            '-map',
            '0:v:0', // Map video stream
            '-map',
            '1:a:0', // Map the generated silent audio stream
            '-shortest', // End when the shortest stream ends (video in this case)
            ...baseFfmpegArgs.slice(7), // Rest of the arguments
          ])

          ffmpegRetry.stderr.on('data', (data) => console.error(`ffmpeg retry stderr: ${data}`))

          ffmpegRetry.on('close', (retryCode) => {
            if (retryCode === 0) resolve()
            else reject(new Error(`ffmpeg exited with code ${retryCode} for ${scene.source}`))
          })
        }
      })
    })
  }

  fs.writeFileSync(fileListPath, fileContent)

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      fileListPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-y',
      outputPath,
    ])

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code} during concatenation`))
    })

    ffmpeg.stderr.on('data', (data) => console.error(`ffmpeg stderr (concat): ${data}`))
  })

  fs.unlinkSync(fileListPath)
  for (const clip of clips) {
    if (fs.existsSync(clip)) {
      fs.unlinkSync(clip)
    }
  }

  return outputPath
}
