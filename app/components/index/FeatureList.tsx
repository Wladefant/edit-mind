import React from 'react';
import { FeatureItem } from './FeatureItem';
import { VideoIcon } from '@/app/icons/VideoIcon';
import { IndexIcon } from '@/app/icons/IndexIcon';
import { ThunderIcon } from '@/app/icons/ThunderIcon';

export const FeatureList: React.FC = () => {
  return (
    <div className="welcome-features">
      <FeatureItem
        icon={<VideoIcon />}
        title="Auto-Detection"
        description="Automatically finds all video files"
      />
      <FeatureItem
        icon={<IndexIcon />}
        title="Smart Indexing"
        description="Creates searchable metadata"
      />
      <FeatureItem
        icon={<ThunderIcon />}
        title="Create rough cuts"
        description="Create clips based on your prompt"
      />
    </div>
  );
};
