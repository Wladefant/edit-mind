import React from 'react';
import { Video } from '@/lib/types/video';
import { VideoCard } from './VideoCard';

interface VideoGridProps {
  videos: Video[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  return (
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard key={video.source} video={video} viewMode="grid" />
      ))}
    </div>
  );
};
