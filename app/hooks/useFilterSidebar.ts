import { useState, useCallback } from 'react';

export const useFilterSidebar = (filters: Record<string, string[]>) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(filters))
  );
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      return newExpanded;
    });
  }, []);

  const handleSearchTermChange = useCallback((category: string, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [category]: value }));
  }, []);

  const getFilteredValues = useCallback(
    (category: string, values: string[]) => {
      const searchTerm = searchTerms[category]?.toLowerCase() || '';
      return values.filter((value) => value.toLowerCase().includes(searchTerm));
    },
    [searchTerms]
  );

  return {
    expandedCategories,
    searchTerms,
    toggleCategory,
    handleSearchTermChange,
    getFilteredValues,
  };
};
