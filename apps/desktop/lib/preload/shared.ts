import type { ElectronAPI, IpcRenderer } from '@electron-toolkit/preload'
import type { ChannelName, ChannelArgs, ChannelReturn } from '@/lib/conveyor/schemas'

type IpcRendererEvent = Parameters<IpcRenderer['on']>[1] extends (event: infer E, ...args: unknown[]) => unknown
  ? E
  : never

export abstract class ConveyorApi {
  protected renderer: IpcRenderer

  constructor(electronApi: ElectronAPI) {
    this.renderer = electronApi.ipcRenderer
  }

  invoke = async <T extends ChannelName>(channel: T, ...args: ChannelArgs<T>): Promise<ChannelReturn<T>> => {
    // Call the IPC method without runtime validation in preload
    // Validation happens on the main process side
    return this.renderer.invoke(channel, ...args) as Promise<ChannelReturn<T>>
  }

  on = <T extends ChannelName>(
    channel: T,
    callback: (...args: ChannelArgs<T>) => void
  ): (() => void) => {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
      callback(...(args as ChannelArgs<T>))
    }
    this.renderer.on(channel, subscription)

    return () => {
      this.renderer.removeListener(channel, subscription)
    }
  }
}