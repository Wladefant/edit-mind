import React from 'react';
import { SortOrder } from './SearchResults';

interface ResultsHeaderProps {
  resultsCount: number;
  allScenesSelected: boolean;
  toggleSelectAll: () => void;
  sortOrder: SortOrder;
  toggleSortOrder: () => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  resultsCount,
  allScenesSelected,
  toggleSelectAll,
  sortOrder,
  toggleSortOrder,
}) => {
  return (
    <header className="results-header">
      <h3>
        Found {resultsCount} Scene{resultsCount !== 1 ? 's' : ''}
      </h3>

      <div className="flex items-center space-x-2">
        <button
          className="select-all-button"
          onClick={toggleSelectAll}
          aria-label={allScenesSelected ? 'Deselect all scenes' : 'Select all scenes'}
        >
          {allScenesSelected ? 'Deselect All' : 'Select All'}
        </button>

        <button
          className="select-all-button"
          onClick={toggleSortOrder}
          aria-label={`Sort by date: Currently ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}`}
        >
          Sort by Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
        </button>
      </div>
    </header>
  );
};
