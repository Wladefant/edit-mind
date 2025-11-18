export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatConfidence(confidence: number | undefined): string | null {
  return confidence !== undefined ? `${Math.round(confidence * 100)}%` : null
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-400'
  if (confidence >= 0.6) return 'text-yellow-400'
  return 'text-orange-400'
}
