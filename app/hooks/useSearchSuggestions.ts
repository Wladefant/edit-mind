import { useState, useEffect } from 'react';
import { SearchSuggestion, VideoMetadataSummary } from '@/lib/types/search';
import { Video, VideoMetadataMap } from '@/lib/types/video';

const summarizeMetadata = (videoMetadata: VideoMetadataMap): VideoMetadataSummary => {
  const topFaces = Array.from(videoMetadata.faces.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topObjects = Array.from(videoMetadata.objects.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topEmotions = Array.from(videoMetadata.emotions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const shotTypes = Array.from(videoMetadata.shotTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const aspectRatios = Array.from(videoMetadata.aspectRatios.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const cameras = Array.from(videoMetadata.cameras.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const topColors = Array.from(videoMetadata.colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalScenes: videoMetadata.totalScenes,
    topFaces,
    topObjects,
    topEmotions,
    shotTypes,
    aspectRatios,
    cameras,
    sampleDescriptions: videoMetadata.descriptions.slice(0, 10),
    topColors,
  };
};

export const useSearchSuggestions = (videos: Video[], videoMetadata: VideoMetadataMap) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  useEffect(() => {
    const generateSuggestions = async () => {
      if (videos.length === 0) return;

      setLoadingSuggestions(true);

      try {
        const metadataSummary = summarizeMetadata(videoMetadata);
        const response = await window.conveyor.app.generateSearchSuggestions(metadataSummary);
        setSuggestions(response);
      } catch (error) {
        console.error('Error generating suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    generateSuggestions();
  }, [videos, videoMetadata]);

  return { suggestions, loadingSuggestions };
};