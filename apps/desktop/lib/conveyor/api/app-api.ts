import { ConveyorApi } from '@/lib/preload/shared'
import { ExportedScene } from '@shared/types/scene'
import { VideoMetadataSummary } from '@shared/types/search'
import { SettingsConfig } from '@shared/types/settings'

export class AppApi extends ConveyorApi {
  version = () => this.invoke('version')
  selectFolder = () => this.invoke('selectFolder')
  startIndexing = (videos: string[]) => this.invoke('startIndexing', videos)
  getAllVideos = () => this.invoke('getAllVideos')
  generateSearchSuggestions = (metadataSummary: VideoMetadataSummary) =>
    this.invoke('generateSearchSuggestions', metadataSummary)
  searchDocuments = (prompt: string) => this.invoke('searchDocuments', prompt)
  stitchVideos = (scenesToStitch: ExportedScene[], videoFilename: string, aspectRatio: string, fps: number) =>
    this.invoke('stitchVideos', scenesToStitch, videoFilename, aspectRatio, fps)
  exportToFcpXml = (scenesToStitch: ExportedScene[], prompt: string, fcpxmlFilename: string) =>
    this.invoke('exportToFcpXml', scenesToStitch, prompt, fcpxmlFilename)
  openFile = (filePath: string) => this.invoke('openFile', filePath)
  showInFolder = (filePath: string) => this.invoke('showInFolder', filePath)
  getSettings = () => this.invoke('getSettings')
  saveSettings = (settings: SettingsConfig) => this.invoke('saveSettings', settings)
  getKnownFaces = () => this.invoke('getKnownFaces')
  getUnknownFaces = () => this.invoke('getUnknownFaces')
  deleteUnknownFace = (imageFile: string, jsonFile: string) => this.invoke('deleteUnknownFace', imageFile, jsonFile)
  labelUnknownFace = (jsonFile: string, faceId: string, name: string) =>
    this.invoke('labelUnknownFace', jsonFile, faceId, name)
  reindexAllFaces = (jsonFile: string, faceId: string, name: string) =>
    this.invoke('reindexAllFaces', jsonFile, faceId, name)
  getAllFaces = () => this.invoke('getAllFaces')
  labelFace = (oldName: string, newName: string) => this.invoke('labelFace', oldName, newName)
  mergeFaces = (facesToMerge: string[]) => this.invoke('mergeFaces', facesToMerge)
  getLocationName = (location: string) => this.invoke('getLocationName', location)
}
