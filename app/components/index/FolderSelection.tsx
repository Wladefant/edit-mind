import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { FolderIcon, FolderCheckIcon } from 'lucide-react';

interface FolderSelectionProps {
  selectedFolder: string | null;
  videos: string[];
  handleSelectFolder: () => void;
  handleCancelIndexing: () => void;
}

export const FolderSelection: React.FC<FolderSelectionProps> = ({
  selectedFolder,
  videos,
  handleSelectFolder,
  handleCancelIndexing,
}) => {
  return (
    <div className="welcome-action-section">
      {!selectedFolder ? (
        <Button size="lg" onClick={handleSelectFolder} className="welcome-primary-button">
          <FolderIcon />
          Select Video Folder
        </Button>
      ) : (
        <div className="selected-folder-display">
          <div className="folder-path-container">
            <FolderCheckIcon />
            <div className="folder-path-text">
              <span className="folder-label">Selected folder:</span>
              <span className="folder-path">{selectedFolder}</span>
              {videos.length} videos
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancelIndexing} className="change-folder-btn">
            Change
          </Button>
        </div>
      )}
    </div>
  );
};
