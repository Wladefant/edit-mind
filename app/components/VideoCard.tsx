import React from 'react'
import { Video } from '@/lib/types/video'
import { Clock, Camera, User, MapPin, Palette } from 'lucide-react'
import '../styles/VideoCard.css'

interface VideoCardProps {
  video: Video
  viewMode: 'grid' | 'list'
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, viewMode }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSceneCount = () => video.scenes?.length || 0
  
  const getUniqueFaces = () => {
    const faces = new Set<string>()
    video.scenes?.forEach((scene) => {
      scene.faces?.forEach((face) => faces.add(face))
    })
    return Array.from(faces)
  }

  const getUniqueLocations = () => {
    const locations = new Set<string>()
    video.scenes?.forEach((scene) => {
      if (scene.location) locations.add(scene.location)
    })
    return Array.from(locations)
  }

  const getDominantColor = () => {
    // Get the most common dominant color from scenes
    const colorMap = new Map<string, { name: string; hex: string; count: number }>()
    
    video.scenes?.forEach((scene) => {
      if (scene.dominantColorName && scene.dominantColorHex) {
        const key = scene.dominantColorHex
        if (colorMap.has(key)) {
          colorMap.get(key)!.count++
        } else {
          colorMap.set(key, {
            name: scene.dominantColorName,
            hex: scene.dominantColorHex,
            count: 1
          })
        }
      }
    })

    if (colorMap.size === 0) return null

    // Return the most frequent color
    return Array.from(colorMap.values()).sort((a, b) => b.count - a.count)[0]
  }

  const uniqueFaces = getUniqueFaces()
  const uniqueLocations = getUniqueLocations()
  const dominantColor = getDominantColor()

  return (
    <div className={`video-card video-card-${viewMode}`}>
      <div className="video-thumbnail-container">
        <img
          src={'thumbnail://' + (video.thumbnailUrl || (video.scenes && video.scenes[0]?.thumbnailUrl))}
          alt={video.source}
          className="video-thumbnail"
        />
        {video.duration && (
          <div className="video-duration">
            <Clock size={12} />
            {formatDuration(parseInt(video.duration.toString() || '0'))}
          </div>
        )}
        {dominantColor && (
          <div 
            className="video-color-indicator" 
            style={{ backgroundColor: dominantColor.hex }}
            title={dominantColor.name}
          />
        )}
  
      </div>

      <div className="video-info">
        <h4 className="video-title" title={video.source}>
          {video.source
            .split('/')
            .pop()
            ?.replace(/\.[^/.]+$/, '') || video.source}
        </h4>

        <div className="video-metadata">
          {video.camera && (
            <div className="metadata-item">
              <Camera size={14} />
              <span>{video.camera}</span>
            </div>
          )}

          {getSceneCount() > 0 && (
            <div className="metadata-item">
              <span className="metadata-label">Scenes:</span>
              <span>{getSceneCount()}</span>
            </div>
          )}

          {uniqueFaces.length > 0 && (
            <div className="metadata-item">
              <User size={14} />
              <span>
                {uniqueFaces.length} {uniqueFaces.length === 1 ? 'person' : 'people'}
              </span>
            </div>
          )}

          {uniqueLocations.length > 0 && (
            <div className="metadata-item">
              <MapPin size={14} />
              <span>
                {uniqueLocations.length === 1 
                  ? uniqueLocations[0] 
                  : `${uniqueLocations.length} locations`}
              </span>
            </div>
          )}

          {dominantColor && viewMode === 'list' && (
            <div className="metadata-item">
              <Palette size={14} />
              <span className="color-name-tag">
                <span 
                  className="color-dot" 
                  style={{ backgroundColor: dominantColor.hex }}
                />
                {dominantColor.name}
              </span>
            </div>
          )}
        </div>

        {viewMode === 'list' && (
          <div className="video-tags-container">
            {uniqueFaces.length > 0 && (
              <div className="video-faces">
                {uniqueFaces.slice(0, 5).map((face) => (
                  <span key={face} className="face-tag">
                    <User size={12} />
                    {face}
                  </span>
                ))}
                {uniqueFaces.length > 5 && (
                  <span className="face-tag-more">+{uniqueFaces.length - 5}</span>
                )}
              </div>
            )}

            {uniqueLocations.length > 0 && (
              <div className="video-locations">
                {uniqueLocations.slice(0, 3).map((location) => (
                  <span key={location} className="location-tag">
                    <MapPin size={12} />
                    {location}
                  </span>
                ))}
                {uniqueLocations.length > 3 && (
                  <span className="location-tag-more">+{uniqueLocations.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}