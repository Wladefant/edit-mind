import React from 'react';
import { Scene } from '@/lib/types/scene';

interface SceneCardProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSceneClick: (index: number) => (e: React.MouseEvent<HTMLDivElement>) => void;
}

const getFileName = (path: string): string => {
  return path.split('/').pop() ?? 'Unknown';
};

const formatTimeRange = (start: number, end: number): string => {
  return `${start.toFixed(1)}s - ${end.toFixed(1)}s`;
};

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, isSelected, onSceneClick }) => {
  const sceneKey = `${scene.source}-${scene.startTime}-${index}`;
  const fileName = getFileName(scene.source);
  const timeRange = formatTimeRange(scene.startTime, scene.endTime);

  return (
    <div
      key={sceneKey}
      role="listitem"
      className={`scene-thumbnail-wrapper ${isSelected ? 'selected' : ''}`}
      onClick={onSceneClick(index)}
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
  );
};
