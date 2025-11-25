export interface IntentClassification {
  type: 'compilation' | 'analytics' | 'general'
  needsVideoData: boolean
}
