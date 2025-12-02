import React from 'react';
import { Search, Grid3x3, List, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

type ViewMode = 'grid' | 'list';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFiltersCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  activeFiltersCount,
}) => {
  return (
    <div className="videos-header">
      <div className="header-left">
        <h1 className="videos-title">Video Library</h1>
      </div>

      <div className="header-actions">
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <Input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="clear-search">
              <X size={16} />
            </Button>
          )}
        </div>

        <div className="view-mode-toggle">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 size={18} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </Button>
        </div>

        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="filter-toggle">
          <SlidersHorizontal size={18} />
          Filters
          {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
        </Button>
      </div>
    </div>
  );
};
