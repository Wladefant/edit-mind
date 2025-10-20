import React, { useState, useEffect, useMemo } from 'react'
import { Video } from '@/lib/types/video'
import { FilterSidebar } from '../components/FilterSidebar'
import { VideoCard } from '../components/VideoCard'
import { Search, Grid3x3, List, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import '../styles/Videos.css'

type ViewMode = 'grid' | 'list'

export const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true)
        const allVideos = await window.conveyor.app.getAllVideos()
        const coordsToFetch = new Map<string, { location: string }>()

        allVideos.forEach((video) => {
          video.scenes?.forEach((scene) => {
            if (scene.location) {
              const key = scene.location
              coordsToFetch.set(key, { location: scene.location })
            }
          })
        })

        const locationMap = new Map<string, string>()
        for (const [coordStr, coords] of coordsToFetch.entries()) {
          const name = await window.conveyor.app.getLocationName(coords.location)
          locationMap.set(coordStr, name)
        }

        const processed = allVideos.map((video) => ({
          ...video,
          scenes: video.scenes?.map((scene) => ({
            ...scene,
            location: scene.location ? locationMap.get(scene.location) || scene.location : undefined,
          })),
        }))
        setVideos(processed)
        setFilteredVideos(processed)
      } catch (error) {
        console.error('Error fetching videos:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVideos()
  }, [])

  const filterableData = useMemo(() => {
    const cameras = new Set<string>()
    const colors = new Set<string>()
    const locations = new Set<string>()
    const faces = new Set<string>()
    const objects = new Set<string>()
    const shotTypes = new Set<string>()

    videos.forEach((video) => {
      if (video.camera) cameras.add(video.camera)
      video.scenes?.forEach((scene) => {
        if (scene.dominantColorName) colors.add(scene.dominantColorName)
        if (scene.location) locations.add(scene.location)
        scene.faces?.forEach((face) => !face.toLocaleLowerCase()?.includes('unknown') && faces.add(face.toLocaleLowerCase()))
        scene.objects?.forEach((object) => objects.add(object))
        if (scene.shot_type) shotTypes.add(scene.shot_type)
      })
    })

    return {
      cameras: Array.from(cameras).sort(),
      colors: Array.from(colors).sort(),
      locations: Array.from(locations).sort(),
      faces: Array.from(faces).sort(),
      objects: Array.from(objects).sort(),
      shotTypes: Array.from(shotTypes).sort(),
    }
  }, [videos])

  useEffect(() => {
    const applyFilters = () => {
      let newFilteredVideos = [...videos]

      // Apply search filter
      if (searchQuery.trim()) {
        newFilteredVideos = newFilteredVideos.filter((video) =>
          video.source.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply category filters
      for (const key in filters) {
        if (filters[key].length > 0) {
          newFilteredVideos = newFilteredVideos.filter((video) => {
            if (key === 'cameras') {
              return filters[key].includes(video.camera)
            }
            return video.scenes?.some((scene) => {
              if (key === 'colors') {
                return filters[key].includes(scene.dominantColorName)
              }
              if (key === 'locations') {
                return filters[key].includes(scene.location)
              }
              if (key === 'faces') {
                return scene.faces?.some((face) => filters[key].includes(face))
              }
              if (key === 'objects') {
                return scene.objects?.some((object) => filters[key].includes(object))
              }
              if (key === 'shotTypes') {
                return filters[key].includes(scene.shot_type)
              }
              return false
            })
          })
        }
      }
      setFilteredVideos(newFilteredVideos)
    }

    applyFilters()
  }, [filters, videos, searchQuery])

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0)
  }, [filters])

  const clearAllFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  return (
    <div className="videos-view">
      {showFilters && (
        <FilterSidebar
          filters={filterableData}
          selectedFilters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="videos-content">
        {/* Header Section */}
        <div className="videos-header">
          <div className="header-left">
            <h1 className="videos-title">Video Library</h1>
            <span className="videos-count">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
            </span>
          </div>

          <div className="header-actions">
            {/* Search Bar */}
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="clear-search">
                  <X size={16} />
                </Button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 size={18} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </Button>
            </div>

            {/* Filter Toggle */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="filter-toggle">
              <SlidersHorizontal size={18} />
              Filters
              {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="active-filters">
            <span className="active-filters-label">Active filters:</span>
            {Object.entries(filters).map(([category, values]) =>
              values.map((value) => (
                <div key={`${category}-${value}`} className="filter-chip">
                  <span className="filter-chip-category">{category.slice(0, -1)}:</span>
                  <span className="filter-chip-value">{value}</span>
                  <button
                    onClick={() => {
                      const newFilters = { ...filters }
                      newFilters[category] = newFilters[category].filter((v) => v !== value)
                      setFilters(newFilters)
                    }}
                    className="filter-chip-remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="clear-filters-btn">
              Clear all
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <h3>No videos found</h3>
            <p>
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your search or filters'
                : 'Start by adding videos to your library'}
            </p>
            {(searchQuery || activeFiltersCount > 0) && <Button onClick={clearAllFilters}>Clear filters</Button>}
          </div>
        ) : (
          /* Video Grid/List */
          <div className={`video-${viewMode}`}>
            {filteredVideos.map((video) => (
              <VideoCard key={video.source} video={video} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
