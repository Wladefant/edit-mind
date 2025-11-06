import os from 'os'
import net from 'net'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { app } from 'electron'
import WebSocket from 'ws'
import { Analysis, AnalysisProgress } from '../types/analysis'

import { IS_WIN, SERVICE_STARTUP_TIMEOUT, MAX_RESTARTS, RESTART_BACKOFF_MS } from '@/lib/constants'
import { FaceIndexingProgress } from '../types/face'

class PythonService {
  private static instance: PythonService
  private serviceProcess: ChildProcess | null = null
  private client: WebSocket | null = null
  private serviceUrl: string | null = null
  private isRunning = false
  private restartCount = 0
  private messageCallbacks: Map<string, (payload: any) => void> = new Map()

  private constructor() {}

  public static getInstance(): PythonService {
    if (!PythonService.instance) {
      PythonService.instance = new PythonService()
    }
    return PythonService.instance
  }

  public async start(): Promise<string> {
    if (this.isRunning) {
      return this.serviceUrl!
    }

    try {
      const comms = await this.getCommunicationArgs()
      this.serviceUrl = comms.url

      const venvPath = path.join(app.getAppPath(), 'python', '.venv')
      const pythonExecutable = IS_WIN
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python')

      const servicePath = path.join(app.getAppPath(), 'python', 'analysis_service.py')

      this.serviceProcess = spawn(pythonExecutable, [servicePath, ...comms.args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      this.serviceProcess.stderr?.on('data', (data) => {
        console.error(`[PythonService STDERR]: ${data.toString().trim()}`)
      })

      this.serviceProcess.on('exit', (code, signal) => {
        console.error(`Python service exited with code ${code}, signal ${signal}`)
        this.isRunning = false
        this.serviceProcess = null
        this.handleCrash()
      })

      await this.waitForServiceReady()
      this.isRunning = true
      this.restartCount = 0
      return this.serviceUrl
    } catch (error) {
      console.error('Failed to start Python service:', error)
      this.stop()
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (this.client) {
      this.client.close()
      this.client = null
    }
    if (this.serviceProcess) {
      this.serviceProcess.removeAllListeners()
      this.serviceProcess.kill('SIGTERM')
      this.serviceProcess = null
    }
    this.isRunning = false

    if (!IS_WIN && this.serviceUrl?.startsWith('ws+unix://')) {
      const socketPath = this.serviceUrl.replace('ws+unix://', '')
      if (socketPath) {
        try {
          await fs.unlink(socketPath)
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error(`Error removing socket file: ${socketPath}`, error)
          }
        }
      }
    }
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

    this.messageCallbacks.set('analysis_progress', onProgress)
    this.messageCallbacks.set('analysis_message', onProgress)
    this.messageCallbacks.set('analysis_result', onResult)
    this.messageCallbacks.set('analysis_complete', onResult)
    this.messageCallbacks.set('analysis_error', onError)
    const message = {
      type: 'analyze',
      payload: { video_path: videoPath },
    }

    this.client.send(JSON.stringify(message))
  }

  public transcribe(
    videoPath: string,
    jsonFilePath: string,
    onProgress: (progress: any) => void,
    onComplete: (result: any) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.isRunning || !this.client) {
      onError(new Error('Python service is not running.'))
      return
    }

    this.messageCallbacks.set('transcription_progress', onProgress)
    this.messageCallbacks.set('transcription_message', onProgress)
    this.messageCallbacks.set('transcription_complete', onComplete)
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

  public getServiceUrl(): string | null {
    return this.serviceUrl
  }

  public isServiceRunning(): boolean {
    return this.isRunning
  }

  private async getCommunicationArgs(): Promise<{ args: string[]; url: string }> {
    if (IS_WIN) {
      const port = await this.findFreePort()
      return {
        args: ['--port', port.toString()],
        url: `ws://127.0.0.1:${port}`,
      }
    } else {
      const socketPath = path.join(os.tmpdir(), `edit-mind-${process.pid}.sock`)
      try {
        await fs.unlink(socketPath)
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error
      }
      return {
        args: ['--socket', socketPath],
        url: `ws+unix://${socketPath}`,
      }
    }
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      server.on('error', reject)
      server.listen(0, () => {
        const port = (server.address() as net.AddressInfo).port
        server.close(() => resolve(port))
      })
    })
  }

  private async waitForServiceReady(): Promise<void> {
    const startTime = Date.now()
    let delay = 200

    while (Date.now() - startTime < SERVICE_STARTUP_TIMEOUT) {
      await new Promise((resolve) => setTimeout(resolve, delay))

      try {
        if (!IS_WIN && this.serviceUrl?.startsWith('ws+unix://')) {
          const socketPath = this.serviceUrl.replace('ws+unix://', '')
          try {
            await fs.access(socketPath)
          } catch {
            delay = Math.min(delay * 1.2, 1000)
            continue
          }
        }

        await this.connectToWebSocket()
        console.log('✓ Successfully connected to Python service')
        return
      } catch {
        delay = Math.min(delay * 1.2, 1000)
      }
    }

    throw new Error(`Python service failed to become ready within ${SERVICE_STARTUP_TIMEOUT / 1000}s timeout.`)
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
      }, 5000)

      this.client = new WebSocket(this.serviceUrl)

      this.client.on('open', () => {
        clearTimeout(timeout)
        console.log('WebSocket connection established.')
        resolve()
      })

      this.client.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          const { type, payload } = message

          const callback = this.messageCallbacks.get(type)

          if (callback) {
            callback(payload)
          }
        } catch (error) {
          console.error('Error processing message:', error)
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
