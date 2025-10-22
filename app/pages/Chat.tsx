import '@/app/styles/Chat.css';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Video } from '@/lib/types/video';
import { VideoConfig } from '@/lib/types/search';
import { useVideoMetadata } from '@/app/hooks/useVideoMetadata';
import { useSearchSuggestions } from '@/app/hooks/useSearchSuggestions';
import { useSearch } from '@/app/hooks/useSearch';
import { useGeneration } from '@/app/hooks/useGeneration';
import { ChatInputArea } from '@/app/components/chat/ChatInputArea';
import { SearchResultsArea } from '@/app/components/chat/SearchResultsArea';
import { SortOrder } from '@/app/components/chat/SearchResults';

export const Chat: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const allVideos = await window.conveyor.app.getAllVideos();
        setVideos(allVideos);
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    };
    fetchVideos();
  }, []);

  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    aspectRatio: '16:9',
    fps: 30,
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  const videoMetadata = useVideoMetadata(videos);
  const { suggestions, loadingSuggestions } = useSearchSuggestions(videos, videoMetadata);
  const { loading: searchLoading, searchResults, searchMetadata, handleSearch } = useSearch(prompt, setVideoConfig);
  const {
    generationStatus,
    generationResult,
    loading: generationLoading,
    handleGenerateRoughCut,
    handleOpenVideo,
    handleShowInFinder,
  } = useGeneration(selectedScenes, searchResults, videoConfig);

  const allScenesSelected = searchResults.length > 0 && selectedScenes.size === searchResults.length;

  const toggleSelectAll = () => {
    if (allScenesSelected) {
      setSelectedScenes(new Set());
    } else {
      const newSelected = new Set<number>();
      searchResults.forEach((_, index) => newSelected.add(index));
      setSelectedScenes(newSelected);
    }
  };

  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedSearchResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      if (sortOrder === 'desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [searchResults, sortOrder]);

  const handleSuggestionClick = (suggestionText: string) => {
    setPrompt(suggestionText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  const toggleSceneSelection = useCallback((index: number) => {
    setSelectedScenes((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  }, []);
  return (
    <div className="chat-view">
      <ChatInputArea
        prompt={prompt}
        setPrompt={setPrompt}
        videos={videos}
        textareaRef={textareaRef}
        suggestions={suggestions}
        loadingSuggestions={loadingSuggestions}
        handleSuggestionClick={handleSuggestionClick}
        showAdvancedSettings={showAdvancedSettings}
        setShowAdvancedSettings={setShowAdvancedSettings}
        videoConfig={videoConfig}
        searchMetadata={searchMetadata}
        setVideoConfig={setVideoConfig}
        handleSearch={handleSearch}
        searchLoading={searchLoading}
      />

      <SearchResultsArea
        generationStatus={generationStatus}
        generationResult={generationResult}
        handleOpenVideo={handleOpenVideo}
        handleShowInFinder={handleShowInFinder}
        sortedSearchResults={sortedSearchResults}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        handleGenerateRoughCut={handleGenerateRoughCut}
        toggleSelectAll={toggleSelectAll}
        generationLoading={generationLoading}
        selectedScenes={selectedScenes}
        toggleSceneSelection={toggleSceneSelection}
        allScenesSelected={allScenesSelected}
      />
    </div>
  );
};