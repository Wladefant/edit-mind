import React from 'react';
import { Clock } from 'lucide-react';
import { Video } from '@/lib/types/video';

interface VideoThumbnailProps {
  video: Video;
  dominantColor: { name: string; hex: string } | null;
  duration: string;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ video, dominantColor, duration }) => {
  return (
    <div className="video-thumbnail-container">
      <img
        src={'thumbnail://' + (video.thumbnailUrl || (video.scenes && video.scenes[0]?.thumbnailUrl))}
        alt={video.source}
        className="video-thumbnail"
      />
      {video.duration && (
        <div className="video-duration">
          <Clock size={12} />
          {duration}
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
  );
};
