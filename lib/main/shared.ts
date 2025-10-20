import path from 'path'

export const THUMBNAILS_DIR = path.resolve('.thumbnails')

export const FACES_DIR = path.resolve('.faces')

import { ipcMain, type WebContents } from 'electron'
import { ipcSchemas, validateArgs, validateReturn, type ChannelArgs, type ChannelReturn } from '@/lib/conveyor/schemas'

/**
 * Helper to create a sender function for a specific webContents
 * @param webContents - The webContents to send the message to
 * @returns A function to send a message to the specified webContents
 */
export const sender = (webContents: WebContents) => {
  return <T extends keyof typeof ipcSchemas>(channel: T, ...args: ChannelArgs<T>) => {
    webContents.send(channel, ...args)
  }
}

/**
 * Helper to register IPC handlers
 * @param channel - The IPC channel to register the handler for
 * @param handler - The handler function to register
 * @returns void
 */
export const handle = <T extends keyof typeof ipcSchemas>(
  channel: T,
  handler: (...args: ChannelArgs<T>) => ChannelReturn<T> | Promise<ChannelReturn<T>>
) => {
  ipcMain.handle(channel, async (_, ...args) => {
    try {
      const validatedArgs = validateArgs(channel, args)
      const result = await handler(...validatedArgs)

      return validateReturn(channel, result)
    } catch (error) {
      console.error(`IPC Error in ${channel}:`, error)
      throw error
    }
  })
}
