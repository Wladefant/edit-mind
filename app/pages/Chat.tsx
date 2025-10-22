import '../styles/Chat.css'
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Video } from '@/lib/types/video'
import { VideoConfig } from '@/lib/types/search'
import { GenerationStatus } from '../components/chat/GenerationStatus'
import { SearchResults, SortOrder } from '../components/chat/SearchResults'
import { AdvancedSetting } from '../components/chat/AdvancedSetting'
import { SearchSuggestions } from '../components/chat/SearchSuggestions'
import { SearchInput } from '../components/chat/SearchInput'
import { useVideoMetadata } from '../hooks/useVideoMetadata'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { useSearch } from '../hooks/useSearch'
import { useGeneration } from '../hooks/useGeneration'

export const Chat: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [prompt, setPrompt] = useState<string>('')
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set())

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const allVideos = await window.conveyor.app.getAllVideos()
        setVideos(allVideos)
      } catch (error) {
        console.error('Error fetching videos:', error)
      }
    }
    fetchVideos()
  }, [])

  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    aspectRatio: '16:9',
    fps: 30,
  })
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false)

  const videoMetadata = useVideoMetadata(videos)
  const { suggestions, loadingSuggestions } = useSearchSuggestions(videos, videoMetadata)
  const { loading: searchLoading, searchResults, searchMetadata, handleSearch } = useSearch(prompt, setVideoConfig)
  const {
    generationStatus,
    generationResult,
    loading: generationLoading,
    handleGenerateRoughCut,
    handleOpenVideo,
    handleShowInFinder,
  } = useGeneration(selectedScenes, searchResults, videoConfig)

  const allScenesSelected = searchResults.length > 0 && selectedScenes.size === searchResults.length

  const toggleSelectAll = () => {
    if (allScenesSelected) {
      setSelectedScenes(new Set())
    } else {
      const newSelected = new Set<number>()
      searchResults.forEach((_, index) => newSelected.add(index))
      setSelectedScenes(newSelected)
    }
  }

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const sortedSearchResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      if (sortOrder === 'desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [searchResults, sortOrder])

  const handleSuggestionClick = (suggestionText: string) => {
    setPrompt(suggestionText)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }
  const toggleSceneSelection = useCallback((index: number) => {
    setSelectedScenes((prevSelected) => {
      const newSelected = new Set(prevSelected)
      if (newSelected.has(index)) {
        newSelected.delete(index)
      } else {
        newSelected.add(index)
      }
      return newSelected
    })
  }, [])
  return (
    <div className="chat-view">
      <div className="chat-input-area">
        {!prompt && suggestions.length > 0 && (
          <SearchSuggestions
            loadingSuggestions={loadingSuggestions}
            suggestions={suggestions}
            handleSuggestionClick={handleSuggestionClick}
          />
        )}

        <SearchInput videos={videos} setPrompt={setPrompt} prompt={prompt} textareaRef={textareaRef} />
        <AdvancedSetting
          showAdvancedSettings={showAdvancedSettings}
          setShowAdvancedSettings={setShowAdvancedSettings}
          videoConfig={videoConfig}
          searchMetadata={searchMetadata}
          setVideoConfig={setVideoConfig}
        />

        <button className="chat-action-button" onClick={handleSearch} disabled={searchLoading || !prompt.trim()}>
          {searchLoading ? (
            <>
              <span className="button-spinner"></span>
              Searching...
            </>
          ) : (
            'Search Scenes'
          )}
        </button>
      </div>

      <GenerationStatus
        generationStatus={generationStatus}
        generationResult={generationResult}
        onOpenVideo={handleOpenVideo}
        onShowInFinder={handleShowInFinder}
      />

      <SearchResults
        sortedSearchResults={sortedSearchResults}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        handleGenerateRoughCut={handleGenerateRoughCut}
        toggleSelectAll={toggleSelectAll}
        loading={generationLoading}
        selectedScenes={selectedScenes}
        toggleSceneSelection={toggleSceneSelection}
        allScenesSelected={allScenesSelected}
      />
    </div>
  )
}
