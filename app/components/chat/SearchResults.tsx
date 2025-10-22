import { Scene } from '@/lib/types/scene'
import { motion } from 'framer-motion'
import type { FC, MouseEvent } from 'react'

export type SortOrder = 'asc' | 'desc'

interface SearchResultsProps {
  sortedSearchResults: readonly Scene[]
  allScenesSelected: boolean
  toggleSelectAll: () => void
  sortOrder: SortOrder
  setSortOrder: (order: SortOrder) => void
  toggleSceneSelection: (index: number) => void
  selectedScenes: ReadonlySet<number>
  handleGenerateRoughCut: () => void | Promise<void>
  loading: boolean
}

export const SearchResults: FC<SearchResultsProps> = ({
  sortedSearchResults,
  allScenesSelected,
  toggleSelectAll,
  sortOrder,
  setSortOrder,
  toggleSceneSelection,
  selectedScenes,
  handleGenerateRoughCut,
  loading,
}) => {
  const hasResults = sortedSearchResults.length > 0
  const hasSelection = selectedScenes.size > 0
  const resultsCount = sortedSearchResults.length
  const selectedCount = selectedScenes.size

  const toggleSortOrder = (): void => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
  }

  const handleSceneClick =
    (index: number) =>
    (e: MouseEvent<HTMLDivElement>): void => {
      e.stopPropagation()
      toggleSceneSelection(index)
    }

  const getSceneKey = (scene: Scene, index: number): string => {
    return `${scene.source}-${scene.startTime}-${index}`
  }

  const getFileName = (path: string): string => {
    return path.split('/').pop() ?? 'Unknown'
  }

  const formatTimeRange = (start: number, end: number): string => {
    return `${start.toFixed(1)}s - ${end.toFixed(1)}s`
  }

  if (!hasResults) {
    return null
  }

  return (
    <div className="search-results-container">
      <header className="results-header">
        <h3>
          Found {resultsCount} Scene{resultsCount !== 1 ? 's' : ''}
        </h3>

        <div className="flex items-center space-x-2">
          <button
            className="select-all-button"
            onClick={toggleSelectAll}
            aria-label={allScenesSelected ? 'Deselect all scenes' : 'Select all scenes'}
          >
            {allScenesSelected ? 'Deselect All' : 'Select All'}
          </button>

          <button
            className="select-all-button"
            onClick={toggleSortOrder}
            aria-label={`Sort by date: Currently ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}`}
          >
            Sort by Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
          </button>
        </div>
      </header>

      <div className="scene-grid" role="list">
        {sortedSearchResults.map((scene, index) => {
          const isSelected = selectedScenes.has(index)
          const sceneKey = getSceneKey(scene, index)
          const fileName = getFileName(scene.source)
          const timeRange = formatTimeRange(scene.startTime, scene.endTime)

          return (
            <div
              key={sceneKey}
              role="listitem"
              className={`scene-thumbnail-wrapper ${isSelected ? 'selected' : ''}`}
              onClick={handleSceneClick(index)}
              aria-label={`Scene from ${fileName}, ${timeRange}`}
              aria-selected={isSelected}
            >
              {scene.thumbnailUrl ? (
                <img
                  src={`thumbnail://${scene.thumbnailUrl}`}
                  alt={scene.description ?? `Scene ${index + 1}`}
                  className="scene-thumbnail-image"
                  loading="lazy"
                />
              ) : (
                <div className="scene-thumbnail-placeholder" aria-label="No preview available">
                  No Preview
                </div>
              )}

              <div className="scene-info">
                <p className="scene-source" title={scene.source}>
                  {fileName}
                </p>
                <p className="scene-time">{timeRange}</p>
                <p className="scene-camera">{scene.camera}</p>
                <p className="scene-date">{scene.createdAt}</p>
              </div>

              {isSelected && (
                <div className="selection-overlay" aria-hidden="true">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-label="Selected">
                    <path
                      d="M1 5L4.5 8.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <motion.button
        className="chat-action-button generate-button"
        onClick={handleGenerateRoughCut}
        disabled={loading || !hasSelection}
        animate={{ scale: loading ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`Generate rough cut with ${selectedCount} selected scene${selectedCount !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Generating...
          </>
        ) : (
          `Generate Rough Cut (${selectedCount} scene${selectedCount !== 1 ? 's' : ''})`
        )}
      </motion.button>
    </div>
  )
}
