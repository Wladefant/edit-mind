import React from 'react';
import { Video } from '@/lib/types/video';
import { useVideoCard } from '../../hooks/useVideoCard';
import { VideoThumbnail } from './VideoThumbnail';
import { VideoMetadata } from './VideoMetadata';
import { VideoTags } from './VideoTags';

interface VideoCardProps {
  video: Video;
  viewMode: 'grid' | 'list';
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, viewMode }) => {
  const { duration, sceneCount, uniqueFaces, uniqueLocations, dominantColor, videoTitle } = useVideoCard(video);

  return (
    <div className={`video-card video-card-${viewMode}`}>
      <VideoThumbnail video={video} dominantColor={dominantColor} duration={duration} />

      <div className="video-info">
        <h4 className="video-title" title={video.source}>
          {videoTitle}
        </h4>

        <VideoMetadata
          camera={video.camera}
          sceneCount={sceneCount}
          uniqueFaces={uniqueFaces}
          uniqueLocations={uniqueLocations}
          dominantColor={dominantColor}
          viewMode={viewMode}
        />

        {viewMode === 'list' && <VideoTags uniqueFaces={uniqueFaces} uniqueLocations={uniqueLocations} />}
      </div>
    </div>
  );
};
