import '@/app/styles/Videos.css';
import React, { useState } from 'react';
import { FilterSidebar } from '@/app/components/videos/FilterSidebar';
import { useVideos } from '@/app/hooks/useVideos';
import { VideoGrid } from '@/app/components/videos/VideoGrid';
import { VideoList } from '@/app/components/videos/VideoList';
import { FilterBar } from '@/app/components/videos/FilterBar';
import { Button } from '@/app/components/ui/Button';
import { X } from 'lucide-react';

type ViewMode = 'grid' | 'list';

export const Videos: React.FC = () => {
  const {
    filteredVideos,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    isLoading,
    filterableData,
    activeFiltersCount,
    clearAllFilters,
  } = useVideos();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(true);

  const removeFilter = (category: string, value: string) => {
    const newFilters = { ...filters };
    newFilters[category] = newFilters[category].filter((v) => v !== value);
    setFilters(newFilters);
  };

  return (
    <div className="videos-view">
      {showFilters && (
        <FilterSidebar
          filters={filterableData}
          selectedFilters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="videos-content">
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFiltersCount={activeFiltersCount}
        />

        {activeFiltersCount > 0 && (
          <div className="active-filters">
            <span className="active-filters-label">Active filters:</span>
            {Object.entries(filters).map(([category, values]) =>
              values.map((value) => (
                <div key={`${category}-${value}`} className="filter-chip">
                  <span className="filter-chip-category">{category.slice(0, -1)}:</span>
                  <span className="filter-chip-value">{value}</span>
                  <button onClick={() => removeFilter(category, value)} className="filter-chip-remove">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="clear-filters-btn">
              Clear all
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <h3>No videos found</h3>
            <p>
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your search or filters'
                : 'Start by adding videos to your library'}
            </p>
            {(searchQuery || activeFiltersCount > 0) && <Button onClick={clearAllFilters}>Clear filters</Button>}
          </div>
        ) : viewMode === 'grid' ? (
          <VideoGrid videos={filteredVideos} />
        ) : (
          <VideoList videos={filteredVideos} />
        )}
      </div>
    </div>
  );
};