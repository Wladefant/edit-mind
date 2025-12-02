import React from 'react';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchInput } from './SearchInput';
import { AdvancedSetting } from './AdvancedSetting';
import { Video } from '@/lib/types/video';
import { SearchMetadata, VideoConfig } from '@/lib/types/search';
import { SearchSuggestion } from '@shared/types/search';

interface ChatInputAreaProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  videos: Video[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  suggestions: SearchSuggestion[];
  loadingSuggestions: boolean;
  handleSuggestionClick: (text: string) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  videoConfig: VideoConfig;
  searchMetadata: SearchMetadata;
  setVideoConfig: (config: VideoConfig | ((prev: VideoConfig) => VideoConfig)) => void;
  handleSearch: () => void;
  searchLoading: boolean;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  prompt,
  setPrompt,
  videos,
  textareaRef,
  suggestions,
  loadingSuggestions,
  handleSuggestionClick,
  showAdvancedSettings,
  setShowAdvancedSettings,
  videoConfig,
  searchMetadata,
  setVideoConfig,
  handleSearch,
  searchLoading,
}) => {
  return (
    <div className="chat-input-area">
      {!prompt && suggestions.length > 0 && (
        <SearchSuggestions
          loadingSuggestions={loadingSuggestions}
          suggestions={suggestions}
          handleSuggestionClick={handleSuggestionClick}
        />
      )}

      <SearchInput videos={videos} setPrompt={setPrompt} prompt={prompt} textareaRef={textareaRef} />
      <AdvancedSetting
        showAdvancedSettings={showAdvancedSettings}
        setShowAdvancedSettings={setShowAdvancedSettings}
        videoConfig={videoConfig}
        searchMetadata={searchMetadata}
        setVideoConfig={setVideoConfig}
      />

      <button className="chat-action-button" onClick={handleSearch} disabled={searchLoading || !prompt.trim()}>
        {searchLoading ? (
          <>
            <span className="button-spinner"></span>
            Searching...
          </>
        ) : (
          'Search Scenes'
        )}
      </button>
    </div>
  );
};
