import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { PlayIcon } from 'lucide-react';
import { IndexingProgress, IndexingProgressProps } from '../IndexingProgress';

interface IndexingSectionProps {
  isIndexing: boolean;
  indexingProgress: IndexingProgressProps | null;
  handleStartIndexing: () => void;
}

export const IndexingSection: React.FC<IndexingSectionProps> = ({
  isIndexing,
  indexingProgress,
  handleStartIndexing,
}) => {
  return (
    <div className="welcome-action-section">
      {!isIndexing ? (
        <Button size="lg" onClick={handleStartIndexing} className="welcome-primary-button start-indexing-btn">
          <PlayIcon />
          Start Indexing
        </Button>
      ) : (
        indexingProgress && <IndexingProgress {...indexingProgress} />
      )}
    </div>
  );
};
