import React from 'react';
import { Video } from '@/lib/types/video';
import { VideoCard } from './VideoCard';

interface VideoListProps {
  videos: Video[];
}

export const VideoList: React.FC<VideoListProps> = ({ videos }) => {
  return (
    <div className="video-list">
      {videos.map((video) => (
        <VideoCard key={video.source} video={video} viewMode="list" />
      ))}
    </div>
  );
};
