import React from 'react';
import { GenerationStatus } from './GenerationStatus';
import { SearchResults, SortOrder } from './SearchResults';
import { Scene } from '@/lib/types/scene';
import { GenerationResult } from '@/lib/types/search';

interface SearchResultsAreaProps {
  generationStatus: string | null;
  generationResult: GenerationResult | null;
  handleOpenVideo: () => void;
  handleShowInFinder: () => void;
  sortedSearchResults: readonly Scene[];
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  handleGenerateRoughCut: () => void | Promise<void>;
  toggleSelectAll: () => void;
  generationLoading: boolean;
  selectedScenes: ReadonlySet<number>;
  toggleSceneSelection: (index: number) => void;
  allScenesSelected: boolean;
}

export const SearchResultsArea: React.FC<SearchResultsAreaProps> = ({
  generationStatus,
  generationResult,
  handleOpenVideo,
  handleShowInFinder,
  sortedSearchResults,
  sortOrder,
  setSortOrder,
  handleGenerateRoughCut,
  toggleSelectAll,
  generationLoading,
  selectedScenes,
  toggleSceneSelection,
  allScenesSelected,
}) => {
  return (
    <>
      <GenerationStatus
        generationStatus={generationStatus}
        generationResult={generationResult}
        onOpenVideo={handleOpenVideo}
        onShowInFinder={handleShowInFinder}
      />

      <SearchResults
        sortedSearchResults={sortedSearchResults}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        handleGenerateRoughCut={handleGenerateRoughCut}
        toggleSelectAll={toggleSelectAll}
        loading={generationLoading}
        selectedScenes={selectedScenes}
        toggleSceneSelection={toggleSceneSelection}
        allScenesSelected={allScenesSelected}
      />
    </>
  );
};
