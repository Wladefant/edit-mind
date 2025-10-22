import React from 'react';
import { Camera, User, MapPin, Palette } from 'lucide-react';

interface VideoMetadataProps {
  camera?: string;
  sceneCount: number;
  uniqueFaces: string[];
  uniqueLocations: string[];
  dominantColor: { name: string; hex: string } | null;
  viewMode: 'grid' | 'list';
}

export const VideoMetadata: React.FC<VideoMetadataProps> = ({
  camera,
  sceneCount,
  uniqueFaces,
  uniqueLocations,
  dominantColor,
  viewMode,
}) => {
  return (
    <div className="video-metadata">
      {camera && (
        <div className="metadata-item">
          <Camera size={14} />
          <span>{camera}</span>
        </div>
      )}

      {sceneCount > 0 && (
        <div className="metadata-item">
          <span className="metadata-label">Scenes:</span>
          <span>{sceneCount}</span>
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
            {uniqueLocations.length === 1 ? uniqueLocations[0] : `${uniqueLocations.length} locations`}
          </span>
        </div>
      )}

      {dominantColor && viewMode === 'list' && (
        <div className="metadata-item">
          <Palette size={14} />
          <span className="color-name-tag">
            <span className="color-dot" style={{ backgroundColor: dominantColor.hex }} />
            {dominantColor.name}
          </span>
        </div>
      )}
    </div>
  );
};
