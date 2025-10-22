import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { FilterOptions } from './FilterOptions';

interface FilterGroupProps {
  category: string;
  values: string[];
  selectedValues: string[];
  isExpanded: boolean;
  searchTerm: string;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onClear: () => void;
  getCategoryLabel: (category: string) => string;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  category,
  values,
  selectedValues,
  isExpanded,
  searchTerm,
  onToggle,
  onSearchChange,
  onFilterChange,
  onClear,
  getCategoryLabel,
}) => {
  const selectedCount = selectedValues.length;

  return (
    <div className="filter-group">
      <button className="filter-group-header" onClick={onToggle}>
        <div className="filter-group-title">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{getCategoryLabel(category)}</span>
          {selectedCount > 0 && <span className="filter-count-badge">{selectedCount}</span>}
        </div>
        {selectedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="clear-category-btn"
          >
            Clear
          </Button>
        )}
      </button>

      {isExpanded && (
        <div className="filter-group-content">
          {values.length > 5 && (
            <Input
              type="text"
              placeholder={`Search ${getCategoryLabel(category).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="filter-search"
            />
          )}
          <FilterOptions
            values={values}
            selectedValues={selectedValues}
            onFilterChange={onFilterChange}
          />
        </div>
      )}
    </div>
  );
};
