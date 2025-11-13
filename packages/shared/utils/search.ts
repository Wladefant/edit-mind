import { VideoMetadataSummary, SearchSuggestion } from '../types/search';

export const generateSearchSuggestions = (metadataSummary: VideoMetadataSummary): SearchSuggestion[] => {
  const suggestions: SearchSuggestion[] = []

  const { topFaces, topColors, topEmotions, shotTypes, topObjects } = metadataSummary

  if (topFaces?.length)
    suggestions.push({
      text: `scenes with @${topFaces[0].name ?? 'someone'}`,
      icon: '👤',
      category: 'people',
      border: 'border-purple-500',
    })

  if (topColors?.length)
    suggestions.push({
      text: `scenes with ${topColors[0].name ?? 'vibrant'} color`,
      icon: '🎨',
      category: 'color',
      border: 'border-red-500',
    })

  if (topEmotions?.length)
    suggestions.push({
      text: `${topEmotions[0].name ?? 'emotional'} moments`,
      icon: '😊',
      category: 'emotion',
      border: 'border-red-500',
    })

  if (shotTypes?.length)
    suggestions.push({
      text: shotTypes[0].name.replace('-', ' '),
      icon: '🎬',
      category: 'scene',
      border: 'border-teal-500',
    })

  if (topObjects?.length)
    suggestions.push({
      text: `scenes with ${topObjects[0].name ?? 'something'}`,
      icon: '📍',
      category: 'scene',
      border: 'border-indigo-500',
    })

  return suggestions.slice(0, 5)
}
