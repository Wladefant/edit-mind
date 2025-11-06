import React from 'react';
import { User, MapPin } from 'lucide-react';

interface VideoTagsProps {
  uniqueFaces: string[];
  uniqueLocations: string[];
}

export const VideoTags: React.FC<VideoTagsProps> = ({ uniqueFaces, uniqueLocations }) => {
  return (
    <div className="video-tags-container">
      {uniqueFaces.length > 0 && (
        <div className="video-faces">
          {uniqueFaces.slice(0, 5).map((face) => (
            <span key={face} className="face-tag">
              <User size={12} />
              {face}
            </span>
          ))}
          {uniqueFaces.length > 5 && <span className="face-tag-more">+{uniqueFaces.length - 5}</span>}
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
          {uniqueLocations.length > 3 && <span className="location-tag-more">+{uniqueLocations.length - 3}</span>}
        </div>
      )}
    </div>
  );
};
