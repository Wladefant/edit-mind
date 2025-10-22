import { Scene } from '@/lib/types/scene';
import { motion } from 'framer-motion';
import type { FC, MouseEvent } from 'react';
import { ResultsHeader } from './ResultsHeader';
import { SceneCard } from './SceneCard';

export type SortOrder = 'asc' | 'desc';

interface SearchResultsProps {
  sortedSearchResults: readonly Scene[];
  allScenesSelected: boolean;
  toggleSelectAll: () => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  toggleSceneSelection: (index: number) => void;
  selectedScenes: ReadonlySet<number>;
  handleGenerateRoughCut: () => void | Promise<void>;
  loading: boolean;
}

export const SearchResults: FC<SearchResultsProps> = ({
  sortedSearchResults,
  allScenesSelected,
  toggleSelectAll,
  sortOrder,
  setSortOrder,
  toggleSceneSelection,
  selectedScenes,
  handleGenerateRoughCut,
  loading,
}) => {
  const hasResults = sortedSearchResults.length > 0;
  const hasSelection = selectedScenes.size > 0;
  const resultsCount = sortedSearchResults.length;
  const selectedCount = selectedScenes.size;

  const toggleSortOrder = (): void => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleSceneClick =
    (index: number) =>
    (e: MouseEvent<HTMLDivElement>): void => {
      e.stopPropagation();
      toggleSceneSelection(index);
    };

  if (!hasResults) {
    return null;
  }

  return (
    <div className="search-results-container">
      <ResultsHeader
        resultsCount={resultsCount}
        allScenesSelected={allScenesSelected}
        toggleSelectAll={toggleSelectAll}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
      />

      <div className="scene-grid" role="list">
        {sortedSearchResults.map((scene, index) => (
          <SceneCard
            key={`${scene.source}-${scene.startTime}-${index}`}
            scene={scene}
            index={index}
            isSelected={selectedScenes.has(index)}
            onSceneClick={handleSceneClick}
          />
        ))}
      </div>

      <motion.button
        className="chat-action-button generate-button"
        onClick={handleGenerateRoughCut}
        disabled={loading || !hasSelection}
        animate={{ scale: loading ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`Generate rough cut with ${selectedCount} selected scene${selectedCount !== 1 ? 's' : ''}`}
      >
        {loading ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Generating...
          </>
        ) : (
          `Generate Rough Cut (${selectedCount} scene${selectedCount !== 1 ? 's' : ''})`
        )}
      </motion.button>
    </div>
  );
};