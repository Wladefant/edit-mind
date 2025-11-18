import 'dotenv/config'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import WebSocket from 'ws'
import { Analysis, AnalysisProgress } from '../types/analysis'
import { IS_WIN, MAX_RESTARTS, RESTART_BACKOFF_MS } from '../constants'
import { FaceIndexingProgress } from '../types/face'
import { MatchResult } from '../types/faces'

class PythonService {
  private static instance: PythonService
  private serviceProcess: ChildProcess | null = null
  private client: WebSocket | null = null
  private serviceUrl: string | null = null
  private isRunning = false
  private restartCount = 0
  private messageCallbacks: Map<string, (payload: any) => void> = new Map()
  private port = process.env.PYTHON_PORT
  private startPromise: Promise<string> | null = null

  private constructor() {
    this.serviceUrl = `ws://localhost:${this.port}`
  }

  public static getInstance(): PythonService {
    if (!PythonService.instance) {
      PythonService.instance = new PythonService()
    }
    return PythonService.instance
  }

  public async start(): Promise<string> {
    // If already starting, wait for that to complete
    if (this.startPromise) {
      console.debug('Python service already starting, waiting...')
      return this.startPromise
    }

    // If already connected, return immediately
    if (this.isRunning && this.client && this.client.readyState === WebSocket.OPEN) {
      console.debug('Python service already connected, reusing connection')
      return this.serviceUrl
    }

    // Create a new start promise
    this.startPromise = this._doStart()

    try {
      const result = await this.startPromise
      return result
    } finally {
      this.startPromise = null
    }
  }

  private async _doStart(): Promise<string> {
    try {
      console.debug('Attempting to connect to existing Python service...')

      if (this.client) {
        this.client.removeAllListeners()
        this.client.close()
        this.client = null
      }

      await this.connectToWebSocket()
      this.isRunning = true
      console.debug('✅ Connected to existing Python service')
      return this.serviceUrl
    } catch {
      console.debug('No existing service found, spawning new one...')
    }

    const venvPath = '/venv'
    const pythonExecutable = IS_WIN
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python')

    const servicePath = path.resolve('/app/python/analysis_service.py')

    console.debug(`Spawning Python service: ${pythonExecutable} ${servicePath}`)

    this.serviceProcess = spawn(pythonExecutable, [servicePath, '--port', this.port?.toString(), '--host', '0.0.0.0'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    if (!this.serviceProcess.pid) {
      throw new Error('Failed to spawn Python service process')
    }

    console.debug(`Python service spawned with PID: ${this.serviceProcess.pid}`)

    this.serviceProcess.stdout?.on('data', (data) => {
      console.debug(`[PythonService STDOUT]: ${data.toString().trim()}`)
    })

    this.serviceProcess.stderr?.on('data', (data) => {
      console.debug(`[PythonService STDERR]: ${data.toString().trim()}`)
    })

    this.serviceProcess.on('error', (error) => {
      console.error('Python service process error:', error)
    })

    this.serviceProcess.on('exit', (code, signal) => {
      console.error(`Python service exited with code ${code}, signal ${signal}`)
      this.isRunning = false
      this.serviceProcess = null
      this.handleCrash()
    })

    console.debug('Waiting for Python service to be ready...')
    const maxAttempts = 15
    const delayMs = 1000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.debug(`Connection attempt ${attempt}/${maxAttempts}...`)
        await this.connectToWebSocket()
        this.isRunning = true
        this.restartCount = 0
        console.debug('✅ Connected to the Python service')
        return this.serviceUrl
      } catch {
        if (attempt === maxAttempts) {
          console.error('Failed to connect to Python service after max attempts')
          this.stop()
          throw new Error(`Python service failed to start within ${maxAttempts * delayMs}ms`)
        }
        console.debug(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    throw new Error('Failed to start Python service')
  }

  public async stop(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners()
      this.client.close()
      this.client = null
    }
    if (this.serviceProcess) {
      this.serviceProcess.removeAllListeners()
      this.serviceProcess.kill('SIGTERM')
      this.serviceProcess = null
    }
    this.isRunning = false
    this.serviceUrl = null
  }

  public analyzeVideo(
    videoPath: string,
    onProgress: (progress: AnalysisProgress) => void,
    onResult: (result: Analysis) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks.delete('analysis_progress')
    this.messageCallbacks.delete('analysis_completed')
    this.messageCallbacks.delete('analysis_error')

    this.messageCallbacks.set('analysis_progress', onProgress)
    this.messageCallbacks.set('analysis_completed', onResult)
    this.messageCallbacks.set('analysis_error', onError)

    const message = {
      type: 'analyze',
      payload: { video_path: videoPath },
    }

    this.client.send(JSON.stringify(message))
  }

  public async transcribe(
    videoPath: string,
    jsonFilePath: string,
    onProgress: (progress: any) => void,
    onComplete: (result: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks.delete('transcription_progress')
    this.messageCallbacks.delete('transcription_message')
    this.messageCallbacks.delete('transcription_completed')
    this.messageCallbacks.delete('transcription_error')

    this.messageCallbacks.set('transcription_progress', (payload) => {
      onProgress(payload)
    })
    this.messageCallbacks.set('transcription_message', onProgress)
    this.messageCallbacks.set('transcription_completed', onComplete)
    this.messageCallbacks.set('transcription_error', onError)

    const message = {
      type: 'transcribe',
      payload: { video_path: videoPath, json_file_path: jsonFilePath },
    }

    this.client.send(JSON.stringify(message))
  }

  public reindexFaces(
    onProgress: (progress: FaceIndexingProgress) => void,
    onComplete: (result: any) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    this.messageCallbacks.set('reindex_progress', onProgress)
    this.messageCallbacks.set('reindex_complete', onComplete)
    this.messageCallbacks.set('reindex_error', onError)

    const message = {
      type: 'reindex_faces',
    }

    this.client.send(JSON.stringify(message))
  }
  public findMatchingFaces(
    personName: string,
    referenceImages: string[],
    unknownFacesDir: string,
    onProgress: (progress: any) => void,
    onComplete: (result: { matches: MatchResult[]; matches_found: number }) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    if (this.client.readyState !== WebSocket.OPEN) {
      onError(new Error(`WebSocket not open. State: ${this.client.readyState}`))
      return
    }

    this.messageCallbacks.delete('face_matching_progress')
    this.messageCallbacks.delete('face_matching_complete')
    this.messageCallbacks.delete('face_matching_error')

    this.messageCallbacks.set('face_matching_progress', onProgress)
    this.messageCallbacks.set('face_matching_complete', onComplete)
    this.messageCallbacks.set('face_matching_error', onError)

    const message = {
      type: 'find_matching_faces',
      payload: {
        person_name: personName,
        reference_images: referenceImages,
        unknown_faces_dir: unknownFacesDir,
        tolerance: 0.6,
      },
    }

    this.client.send(JSON.stringify(message))
  }
  public getServiceUrl(): string | null {
    return this.serviceUrl
  }

  public isServiceRunning(): boolean {
    return this.isRunning
  }

  private connectToWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.serviceUrl) {
        return reject(new Error('Service URL not set'))
      }

      const timeout = setTimeout(() => {
        if (this.client) {
          this.client.terminate()
          this.client = null
        }
        reject(new Error('WebSocket connection timeout'))
      }, 3000)

      this.client = new WebSocket(this.serviceUrl)

      this.client.on('open', () => {
        clearTimeout(timeout)
        console.debug('✅ WebSocket connection established.')
        resolve()
      })

      this.client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const { type, payload } = message

          const callback = this.messageCallbacks.get(type)

          if (callback) {
            callback(payload)
          } else {
            console.warn(`⚠️ No callback registered for message type: ${type}`)
          }
        } catch (error) {
          console.error('❌ Error processing message:', error)
        }
      })

      this.client.on('error', (error) => {
        clearTimeout(timeout)
        this.client = null
        reject(error)
      })

      this.client.on('close', () => {
        clearTimeout(timeout)
        this.client = null
        this.isRunning = false
      })
    })
  }

  private handleCrash() {
    if (this.restartCount < MAX_RESTARTS) {
      this.restartCount++
      const delay = this.restartCount * RESTART_BACKOFF_MS
      setTimeout(() => this.start().catch((err) => console.error('Restart failed:', err)), delay)
    } else {
      console.error('Python service has crashed too many times. Will not restart.')
    }
  }
}

export const pythonService = PythonService.getInstance()
