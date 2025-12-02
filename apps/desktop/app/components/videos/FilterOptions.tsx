import React from 'react';

interface FilterOptionsProps {
  values: string[];
  selectedValues: string[];
  onFilterChange: (value: string) => void;
}

export const FilterOptions: React.FC<FilterOptionsProps> = ({ values, selectedValues, onFilterChange }) => {
  if (values.length === 0) {
    return <p className="no-results">No matches found</p>;
  }

  return (
    <div className="filter-options">
      {values.map((value) => {
        const isSelected = selectedValues.includes(value);
        return (
          <label key={value} className={`filter-option ${isSelected ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onFilterChange(value)}
            />
            <span className="filter-option-label">{value}</span>
          </label>
        );
      })}
    </div>
  );
};
