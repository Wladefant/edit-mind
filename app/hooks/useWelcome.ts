import { useState, useEffect, useCallback } from 'react';
import { IndexingProgressProps } from '../components/IndexingProgress';
import { useConveyor } from './use-conveyor';

export const useWelcome = () => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgressProps | null>(null);
  const appApi = useConveyor('app');

  useEffect(() => {
    if (!appApi) return;

    const unsubscribe = appApi.on('indexing-progress', (progress) => {
      setIndexingProgress(progress);
    });

    return () => {
      unsubscribe();
    };
  }, [appApi]);

  const handleSelectFolder = useCallback(async () => {
    if (!appApi) return;
    const result = await appApi.selectFolder();
    if (result) {
      setSelectedFolder(result.folderPath);
      setVideos(result.videos);
    }
  }, [appApi]);

  const handleStartIndexing = useCallback(async () => {
    if (!appApi) return;
    setIsIndexing(true);
    await appApi.startIndexing(videos);
    setIsIndexing(false);
  }, [appApi, videos]);

  const handleCancelIndexing = useCallback(() => {
    setSelectedFolder(null);
    setVideos([]);
    setIsIndexing(false);
    setIndexingProgress(null);
  }, []);

  return {
    selectedFolder,
    videos,
    isIndexing,
    indexingProgress,
    handleSelectFolder,
    handleStartIndexing,
    handleCancelIndexing,
  };
};
