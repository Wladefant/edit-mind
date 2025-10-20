import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Video } from '@/lib/types/video'
import { ExportedScene, Scene } from '@/lib/types/scene'
import '../styles/Chat.css'
import defaultFaces from '../../faces.json'
import { FaceData, GenerationResult, SearchSuggestion, VideoConfig } from '@/lib/types/search'

export const Chat: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const loadedFaces: Record<string, string[]> = defaultFaces
  const [prompt, setPrompt] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [searchResults, setSearchResults] = useState<Scene[]>([])
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set())
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false)
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState<string>('')
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState<number>(0)

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

  const [searchMetadata, setSearchMetadata] = useState<{
    aspectRatio?: string
    faces?: string[]
  }>({})

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightLayerRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const faces = useMemo(() => {
    const getFirstImage = (name: string) => {
      const lowercasedName = name.toLowerCase()
      const foundKey = Object.keys(loadedFaces).find((key) => key.toLowerCase() === lowercasedName)

      if (foundKey && loadedFaces[foundKey] && loadedFaces[foundKey].length > 0) {
        return loadedFaces[foundKey][0]
      }
      return null
    }

    const faceMap = new Map<string, FaceData>()

    videos.forEach((video) => {
      if (video.scenes && video.scenes.length > 0) {
        video.scenes.forEach((scene) => {
          if (scene.faces && scene.faces.length > 0) {
            scene.faces.forEach((face) => {
              if (!face.toLocaleLowerCase().includes('unknown')) {
                const existing = faceMap.get(face)
                if (existing) {
                  existing.count++
                } else {
                  const thumbnail = getFirstImage(face.toLowerCase())
                  faceMap.set(face, {
                    name: face,
                    count: 1,
                    thumbnail: thumbnail ? 'face://' + thumbnail : undefined,
                  })
                }
              }
            })
          }
        })
      }
    })

    return Array.from(faceMap.values()).sort((a, b) => b.count - a.count)
  }, [videos, loadedFaces])

  const videoMetadata = useMemo(() => {
    const metadata = {
      faces: new Map<string, number>(),
      objects: new Map<string, number>(),
      emotions: new Map<string, number>(),
      shotTypes: new Map<string, number>(),
      aspectRatios: new Map<string, number>(),
      cameras: new Map<string, number>(),
      descriptions: [] as string[],
      totalScenes: 0,
      colors: new Map<string, number>(),
    }

    videos.forEach((video) => {
      if (video.scenes && video.scenes.length > 0) {
        metadata.totalScenes += video.scenes.length

        video.scenes.forEach((scene: Scene) => {
          if (scene.faces) {
            scene.faces.forEach((face) => {
              if (!face.toLocaleLowerCase().includes('unknown')) {
                metadata.faces.set(face, (metadata.faces.get(face) || 0) + 1)
              }
            })
          }

          if (scene.objects) {
            scene.objects.forEach((obj) => {
              if (obj) {
                metadata.objects.set(obj, (metadata.objects.get(obj) || 0) + 1)
              }
            })
          }

          if (scene.emotions) {
            scene.emotions.forEach((emotion) => {
              if (emotion) {
                metadata.emotions.set(emotion.emotion, (metadata.emotions.get(emotion.emotion) || 0) + 1)
              }
            })
          }

          if (scene.shot_type && scene.shot_type !== 'N/A') {
            metadata.shotTypes.set(scene.shot_type, (metadata.shotTypes.get(scene.shot_type) || 0) + 1)
          }
          if (scene.dominantColorName && scene.dominantColorName !== 'N/A') {
            metadata.colors.set(scene.dominantColorName, (metadata.shotTypes.get(scene.dominantColorName) || 0) + 1)
          }

          if (scene.description) {
            metadata.descriptions.push(scene.description)
          }
        })
      }

      if (video.aspect_ratio) {
        metadata.aspectRatios.set(video.aspect_ratio, (metadata.aspectRatios.get(video.aspect_ratio) || 0) + 1)
      }

      if (video.camera) {
        metadata.cameras.set(video.camera, (metadata.cameras.get(video.camera) || 0) + 1)
      }
    })

    return metadata
  }, [videos])

  const filteredFaces = useMemo(() => {
    if (!autocompleteQuery) return faces
    const query = autocompleteQuery.toLowerCase()
    return faces.filter((face) => face.name.toLowerCase().includes(query))
  }, [faces, autocompleteQuery])

  const highlightedText = useMemo(() => {
    const mentionRegex = /@(\w+)/g
    const parts: Array<{ text: string; isMention: boolean }> = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(prompt)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: prompt.slice(lastIndex, match.index),
          isMention: false,
        })
      }
      parts.push({
        text: match[0],
        isMention: true,
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < prompt.length) {
      parts.push({
        text: prompt.slice(lastIndex),
        isMention: false,
      })
    }

    return parts
  }, [prompt])

  const syncScroll = () => {
    if (textareaRef.current && highlightLayerRef.current) {
      highlightLayerRef.current.scrollTop = textareaRef.current.scrollTop
      highlightLayerRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  useEffect(() => {
    const generateSuggestions = async () => {
      if (videos.length === 0) return

      setLoadingSuggestions(true)

      try {
        const topFaces = Array.from(videoMetadata.faces.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        const topObjects = Array.from(videoMetadata.objects.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))

        const topEmotions = Array.from(videoMetadata.emotions.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        const shotTypes = Array.from(videoMetadata.shotTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))

        const aspectRatios = Array.from(videoMetadata.aspectRatios.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))

        const cameras = Array.from(videoMetadata.cameras.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))

        const topColors = Array.from(videoMetadata.colors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        const metadataSummary = {
          totalScenes: videoMetadata.totalScenes,
          topFaces,
          topObjects,
          topEmotions,
          shotTypes,
          aspectRatios,
          cameras,
          sampleDescriptions: videoMetadata.descriptions.slice(0, 10),
          topColors,
        }

        const response = await window.conveyor.app.generateSearchSuggestions(metadataSummary)

        setSuggestions(getFallbackSuggestions())
      } catch (error) {
        console.error('Error generating suggestions:', error)
        setSuggestions(getFallbackSuggestions())
      } finally {
        setLoadingSuggestions(false)
      }
    }

    generateSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, videoMetadata])

  useEffect(() => {
    if (showAutocomplete && autocompleteRef.current) {
      const selectedElement = autocompleteRef.current.querySelector('.autocomplete-item.selected') as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }
  }, [selectedAutocompleteIndex, showAutocomplete])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFallbackSuggestions = (): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = []

    if (faces.length > 0) {
      suggestions.push({
        text: `scenes with @${faces[0].name}`,
        icon: '👤',
        category: 'people',
      })
    }
    const topColor = Array.from(videoMetadata.colors.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topColor) {
      suggestions.push({
        text: `scenes with ${topColor[0]} tones`,
        icon: '🎨',
        category: 'color',
      })
    }
    const topObject = Array.from(videoMetadata.objects.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topObject) {
      suggestions.push({
        text: `scenes with ${topObject[0]}`,
        icon: '📍',
        category: 'scene',
      })
    }
    const topEmotion = Array.from(videoMetadata.emotions.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topEmotion) {
      suggestions.push({
        text: `${topEmotion[0]} moments`,
        icon: '😊',
        category: 'emotion',
      })
    }

    const topShotType = Array.from(videoMetadata.shotTypes.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topShotType) {
      suggestions.push({
        text: `${topShotType[0].replace('-', ' ')}s`,
        icon: '🎬',
        category: 'scene',
      })
    }

    return suggestions
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0

    setPrompt(newValue)

    const textBeforeCursor = newValue.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setAutocompleteQuery(textAfterAt)
        setShowAutocomplete(true)
        setSelectedAutocompleteIndex(0)
        return
      }
    }

    setShowAutocomplete(false)
  }

  const handleSuggestionClick = (suggestionText: string) => {
    setPrompt(suggestionText)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const insertFaceName = useCallback(
    (faceName: string) => {
      if (!textareaRef.current) return

      const cursorPosition = textareaRef.current.selectionStart || 0
      const textBeforeCursor = prompt.slice(0, cursorPosition)
      const textAfterCursor = prompt.slice(cursorPosition)

      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex !== -1) {
        const newPrompt = prompt.slice(0, lastAtIndex) + `@${faceName} ` + textAfterCursor

        setPrompt(newPrompt)
        setShowAutocomplete(false)

        setTimeout(() => {
          if (textareaRef.current) {
            const newCursorPos = lastAtIndex + faceName.length + 2
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
            textareaRef.current.focus()
          }
        }, 0)
      }
    },
    [prompt]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showAutocomplete || filteredFaces.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedAutocompleteIndex((prev) => Math.min(prev + 1, filteredFaces.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedAutocompleteIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          insertFaceName(filteredFaces[selectedAutocompleteIndex].name)
          break
        case 'Escape':
          e.preventDefault()
          setShowAutocomplete(false)
          break
        case 'Tab':
          e.preventDefault()
          insertFaceName(filteredFaces[selectedAutocompleteIndex].name)
          break
      }
    },
    [showAutocomplete, filteredFaces, selectedAutocompleteIndex, insertFaceName]
  )

  const handleSearch = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    setSearchResults([])
    setSelectedScenes(new Set())
    setGenerationStatus(null)
    setGenerationResult(null)

    try {
      const { results, aspect_ratio, faces } = await window.conveyor.app.searchDocuments(prompt)
      setSearchResults(results)
      setSelectedScenes(new Set())

      if (aspect_ratio && faces)
        setSearchMetadata({
          aspectRatio: aspect_ratio,
          faces,
        })

      if (aspect_ratio) {
        setVideoConfig((prev) => ({ ...prev, aspectRatio: aspect_ratio }))
      }
    } catch (error) {
      console.error('Error searching scenes:', error)
      setGenerationStatus('Error during search. Please try again.')
    } finally {
      setLoading(false)
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

  const handleGenerateRoughCut = async () => {
    if (selectedScenes.size === 0) {
      setGenerationStatus('Please select at least one scene to generate a rough cut.')
      return
    }

    setLoading(true)
    setGenerationStatus('Generating rough cut...')
    setGenerationResult(null)

    try {
      const scenesToStitch: ExportedScene[] = Array.from(selectedScenes)
        .map((index) => {
          const scene = searchResults[index]
          return {
            source: scene.source,
            startTime: scene.startTime,
            endTime: scene.endTime,
          }
        })
        .sort((a, b) => {
          if (a.source < b.source) return -1
          if (a.source > b.source) return 1
          return a.startTime - b.startTime
        })

      const outputFilename = `rough_cut_${Date.now()}`
      const videoFilename = `${outputFilename}.mp4`
      const fcpxmlFilename = `${outputFilename}.fcpxml`

      await window.conveyor.app.stitchVideos(
        scenesToStitch,
        videoFilename,
        videoConfig.aspectRatio,
        videoConfig.fps
      )
      await window.conveyor.app.exportToFcpXml(scenesToStitch, prompt, fcpxmlFilename)

      const result = {
        message: `Rough cut "${videoFilename}" and FCPXML exported successfully!`,
        videoPath: videoFilename,
        fcpxmlPath: fcpxmlFilename,
      }

      setGenerationStatus(result.message)
      setGenerationResult(result)
    } catch (error) {
      console.error('Error generating rough cut:', error)
      setGenerationStatus('Error generating rough cut. Please check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenVideo = async () => {
    if (!generationResult?.videoPath) return

    try {
      await window.conveyor.app.openFile(generationResult.videoPath)
    } catch (error) {
      console.error('Error opening video:', error)
      setGenerationStatus('Error opening video file.')
    }
  }

  const handleOpenFCPX = async () => {
    if (!generationResult?.fcpxmlPath) return

    try {
      await window.conveyor.app.openFile(generationResult.fcpxmlPath)
    } catch (error) {
      console.error('Error opening FCPXML:', error)
      setGenerationStatus('Error opening Final Cut Pro project.')
    }
  }

  const handleShowInFinder = async () => {
    if (!generationResult?.videoPath) return

    try {
      await window.conveyor.app.showInFolder(generationResult.videoPath)
    } catch (error) {
      console.error('Error showing in finder:', error)
      setGenerationStatus('Error showing file in folder.')
    }
  }

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

  const [sortOrder, setSortOrder] = useState('desc')

  const sortedSearchResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      if (sortOrder === 'desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [searchResults, sortOrder])

  return (
    <div className="chat-view">
      <div className="chat-input-area">
        {!prompt && suggestions.length > 0 && (
          <div className="search-suggestions">
            <span className="suggestions-label">
              {loadingSuggestions ? 'Analyzing your videos...' : 'Try searching for:'}
            </span>
            <div className="suggestions-grid">
              {loadingSuggestions
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="suggestion-chip skeleton">
                      <div className="skeleton-icon"></div>
                      <div className="skeleton-text"></div>
                    </div>
                  ))
                : suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`suggestion-chip ${suggestion.category}`}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                    >
                      <span className="suggestion-icon">{suggestion.icon}</span>
                      <span className="suggestion-text">{suggestion.text}</span>
                    </button>
                  ))}
            </div>
          </div>
        )}

        <div className="chat-input-wrapper">
          <div className="highlight-container">
            <div ref={highlightLayerRef} className="highlight-layer" aria-hidden="true">
              {highlightedText.map((part, index) => (
                <span key={index} className={part.isMention ? 'mention-highlight' : ''}>
                  {part.text}
                </span>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="chat-prompt-input"
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              placeholder="Describe your rough cut (e.g., 'scenes with @John and a forest wide shot'). Type @ to mention people."
              rows={3}
            />
          </div>

          {showAutocomplete && filteredFaces.length > 0 && (
            <div ref={autocompleteRef} className="autocomplete-dropdown">
              {filteredFaces.map((face, index) => (
                <div
                  key={face.name}
                  className={`autocomplete-item ${index === selectedAutocompleteIndex ? 'selected' : ''}`}
                  onClick={() => insertFaceName(face.name)}
                  onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                >
                  {face.thumbnail ? (
                    <img src={face.thumbnail} alt={face.name} className="autocomplete-thumbnail" />
                  ) : (
                    <div className="autocomplete-thumbnail-placeholder">{face.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="autocomplete-info">
                    <span className="autocomplete-name">{face.name}</span>
                    <span className="autocomplete-count">
                      {face.count} scene{face.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="video-config-panel">
          <button className="advanced-settings-toggle" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
            <span className="toggle-icon">{showAdvancedSettings ? '▼' : '▶'}</span>
            Advanced Settings
          </button>

          {showAdvancedSettings && (
            <div className="config-options">
              <div className="config-row">
                <div className="config-item">
                  <label htmlFor="aspect-ratio-select">Aspect Ratio</label>
                  <select
                    id="aspect-ratio-select"
                    value={videoConfig.aspectRatio}
                    onChange={(e) => setVideoConfig((prev) => ({ ...prev, aspectRatio: e.target.value }))}
                    className="config-select"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="21:9">21:9 (Cinematic)</option>
                  </select>
                </div>

                <div className="config-item">
                  <label htmlFor="fps-slider">
                    Frame Rate: <strong>{videoConfig.fps} fps</strong>
                  </label>
                  <input
                    id="fps-slider"
                    type="range"
                    min="24"
                    max="60"
                    step="1"
                    value={videoConfig.fps}
                    onChange={(e) => setVideoConfig((prev) => ({ ...prev, fps: parseInt(e.target.value) }))}
                    className="config-slider"
                  />
                  <div className="slider-labels">
                    <span>24 fps</span>
                    <span>60 fps</span>
                  </div>
                </div>
              </div>

              {searchMetadata.aspectRatio && (
                <div className="config-info">
                  <span className="info-icon">ℹ️</span>
                  <span>Detected aspect ratio from search: {searchMetadata.aspectRatio}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="chat-action-button" onClick={handleSearch} disabled={loading || !prompt.trim()}>
          {loading ? (
            <>
              <span className="button-spinner"></span>
              Searching...
            </>
          ) : (
            'Search Scenes'
          )}
        </button>
      </div>

      {generationStatus && (
        <div className={`generation-status ${generationStatus.startsWith('Error') ? 'error' : 'success'}`}>
          {generationStatus}
          {generationResult && (
            <div className="generation-actions">
              <button className="action-button primary" onClick={handleOpenVideo}>
                <span className="action-icon">▶️</span>
                Open Video
              </button>
              <button className="action-button secondary" onClick={handleOpenFCPX}>
                <span className="action-icon">🎬</span>
                Open in FCPX
              </button>
              <button className="action-button tertiary" onClick={handleShowInFinder}>
                <span className="action-icon">📁</span>
                Show in Finder
              </button>
            </div>
          )}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="search-results-container">
          <div className="results-header">
            <h3>
              Found {searchResults.length} Scene{searchResults.length !== 1 ? 's' : ''}
            </h3>
            <div className="flex items-center space-x-2">
              <button className="select-all-button" onClick={toggleSelectAll}>
                {allScenesSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button className="select-all-button" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                Sort by Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
              </button>
            </div>
          </div>
          <div className="scene-grid">
            {sortedSearchResults.map((scene, index) => (
              <div
                key={`${scene.source}-${scene.startTime}-${index}`}
                className={`scene-thumbnail-wrapper ${selectedScenes.has(index) ? 'selected' : ''}`}
                onClick={() => toggleSceneSelection(index)}
              >
                {scene.thumbnailUrl ? (
                  <img
                    src={'thumbnail://' + scene.thumbnailUrl}
                    alt={`Scene ${scene.description || index + 1}`}
                    className="scene-thumbnail-image"
                  />
                ) : (
                  <div className="scene-thumbnail-placeholder">No Preview</div>
                )}
                <div className="scene-info">
                  <p className="scene-source">{scene.source.split('/').pop()}</p>
                  <p className="scene-time">
                    {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s
                  </p>
                  <p className="scene-camera">{scene.camera}</p>
                  <p className="scene-date">{scene.createdAt}</p>
                </div>
                {selectedScenes.has(index) && (
                  <div className="selection-overlay">
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
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
            ))}
          </div>
          <button
            className="chat-action-button generate-button"
            onClick={handleGenerateRoughCut}
            disabled={loading || selectedScenes.size === 0}
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Generating...
              </>
            ) : (
              `Generate Rough Cut (${selectedScenes.size} scene${selectedScenes.size !== 1 ? 's' : ''})`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
