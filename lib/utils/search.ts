import { SearchSuggestion, VideoMetadataSummary } from "../types/search"

export const generateSearchSuggestions = (metadataSummary: VideoMetadataSummary): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = []

  if (metadataSummary.topFaces.length > 0) {
    suggestions.push({
      text: `scenes with @${metadataSummary.topFaces[0].name}`,
      icon: '👤',
      category: 'people',
    })
  }

  if (metadataSummary.topEmotions.length > 0) {
    suggestions.push({
      text: `${metadataSummary.topEmotions[0].name} moments`,
      icon: '😊',
      category: 'emotion',
    })
  }

  if (metadataSummary.shotTypes.length > 0) {
    suggestions.push({
      text: `${metadataSummary.shotTypes[0].name.replace('-', ' ')}s`,
      icon: '🎬',
      category: 'scene',
    })
  }

  if (metadataSummary.topObjects.length > 0) {
    suggestions.push({
      text: `scenes with ${metadataSummary.topObjects[0].name}`,
      icon: '📍',
      category: 'scene',
    })
  }

  return suggestions.slice(0, 4)
}
