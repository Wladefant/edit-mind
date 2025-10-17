import { ConveyorApi } from '@/lib/preload/shared'

export class AppApi extends ConveyorApi {
  version = () => this.invoke('version')
  selectFolder = () => this.invoke('selectFolder')
  startIndexing = (videos: string[]) => this.invoke('startIndexing', videos)
  getAllVideos = () => this.invoke('getAllVideos')
  generateSearchSuggestions = (metadataSummary: any) => this.invoke('generateSearchSuggestions', metadataSummary)
  searchDocuments = (prompt: string) => this.invoke('searchDocuments', prompt)
  stitchVideos = (scenesToStitch: any[], videoFilename: string, aspectRatio: string, duration: number, fps: number) =>
    this.invoke('stitchVideos', scenesToStitch, videoFilename, aspectRatio, duration, fps)
  exportToFcpXml = (scenesToStitch: any[], prompt: string, fcpxmlFilename: string) =>
    this.invoke('exportToFcpXml', scenesToStitch, prompt, fcpxmlFilename)
  openFile = (filePath: string) => this.invoke('openFile', filePath)
  showInFolder = (filePath: string) => this.invoke('showInFolder', filePath)
}
