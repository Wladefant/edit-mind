import { SearchSuggestion } from '@/lib/types/search'
import type { FC, MouseEvent } from 'react'

interface SearchSuggestionsProps {
  loadingSuggestions: boolean
  suggestions: readonly SearchSuggestion[]
  handleSuggestionClick: (text: string) => void
}

const SKELETON_COUNT = 5 as const

export const SearchSuggestions: FC<SearchSuggestionsProps> = ({
  loadingSuggestions,
  suggestions,
  handleSuggestionClick,
}) => {
  const onSuggestionClick =
    (text: string) =>
    (e: MouseEvent<HTMLButtonElement>): void => {
      e.preventDefault()
      handleSuggestionClick(text)
    }

  return (
    <div className="search-suggestions" role="region" aria-label="Search suggestions">
      <span className="suggestions-label">
        {loadingSuggestions ? 'Analyzing your videos...' : 'Try searching for:'}
      </span>

      <div className="suggestions-grid" role="list">
        {loadingSuggestions
          ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div key={`skeleton-${i}`} className="suggestion-chip skeleton" aria-hidden="true">
                <div className="skeleton-icon" />
                <div className="skeleton-text" />
              </div>
            ))
          : suggestions.map((suggestion) => (
              <button
                key={`${suggestion.category}-${suggestion.text}`}
                type="button"
                className={`suggestion-chip ${suggestion.category}`}
                onClick={onSuggestionClick(suggestion.text)}
                aria-label={`Search for: ${suggestion.text}`}
              >
                <span className="suggestion-icon" aria-hidden="true">
                  {suggestion.icon}
                </span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
      </div>
    </div>
  )
}
