import '@/app/styles/FilterSidebar.css'
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { useFilterSidebar } from '@/app/hooks/useFilterSidebar';
import { FilterGroup } from './FilterGroup';

interface FilterSidebarProps {
  filters: Record<string, string[]>;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  onClose: () => void;
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    cameras: 'Cameras',
    colors: 'Colors',
    locations: 'Locations',
    faces: 'People',
    objects: 'Objects',
    shotTypes: 'Shot Types',
  };
  return labels[category] || category;
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  onClose,
}) => {
  const {
    expandedCategories,
    searchTerms,
    toggleCategory,
    handleSearchTermChange,
    getFilteredValues,
  } = useFilterSidebar(filters);

  const handleFilterChange = (category: string, value: string) => {
    const newFilters = { ...selectedFilters };
    if (!newFilters[category]) {
      newFilters[category] = [];
    }

    if (newFilters[category].includes(value)) {
      newFilters[category] = newFilters[category].filter((item) => item !== value);
    } else {
      newFilters[category].push(value);
    }

    onFilterChange(newFilters);
  };

  const clearCategory = (category: string) => {
    const newFilters = { ...selectedFilters };
    newFilters[category] = [];
    onFilterChange(newFilters);
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h3>Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>

      <div className="filter-sidebar-content">
        {Object.entries(filters).map(([category, values]) => (
          <FilterGroup
            key={category}
            category={category}
            values={getFilteredValues(category, values)}
            selectedValues={selectedFilters[category] || []}
            isExpanded={expandedCategories.has(category)}
            searchTerm={searchTerms[category] || ''}
            onToggle={() => toggleCategory(category)}
            onSearchChange={(value) => handleSearchTermChange(category, value)}
            onFilterChange={(value) => handleFilterChange(category, value)}
            onClear={() => clearCategory(category)}
            getCategoryLabel={getCategoryLabel}
          />
        ))}
      </div>
    </div>
  );
};
