import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import '../styles/FilterSidebar.css';

interface FilterSidebarProps {
  filters: Record<string, string[]>;
  selectedFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  onClose: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  onClose,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(filters))
  );
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

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

  const getFilteredValues = (category: string, values: string[]) => {
    const searchTerm = searchTerms[category]?.toLowerCase() || '';
    return values.filter((value) => value.toLowerCase().includes(searchTerm));
  };

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

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h3>Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>

      <div className="filter-sidebar-content">
        {Object.entries(filters).map(([category, values]) => {
          const selectedCount = selectedFilters[category]?.length || 0;
          const isExpanded = expandedCategories.has(category);
          const filteredValues = getFilteredValues(category, values);

          return (
            <div key={category} className="filter-group">
              <button
                className="filter-group-header"
                onClick={() => toggleCategory(category)}
              >
                <div className="filter-group-title">
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  <span>{getCategoryLabel(category)}</span>
                  {selectedCount > 0 && (
                    <span className="filter-count-badge">{selectedCount}</span>
                  )}
                </div>
                {selectedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearCategory(category);
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
                      value={searchTerms[category] || ''}
                      onChange={(e) =>
                        setSearchTerms({ ...searchTerms, [category]: e.target.value })
                      }
                      className="filter-search"
                    />
                  )}

                  <div className="filter-options">
                    {filteredValues.length > 0 ? (
                      filteredValues.map((value) => {
                        const isSelected = selectedFilters[category]?.includes(value);
                        return (
                          <label
                            key={value}
                            className={`filter-option ${isSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleFilterChange(category, value)}
                            />
                            <span className="filter-option-label">{value}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="no-results">No matches found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};