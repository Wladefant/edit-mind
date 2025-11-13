import { useState, useMemo } from 'react'

export const useFilterSidebar = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleSearchTermChange = (category: string, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [category]: value }))
  }

  const getFilteredValues = useMemo(() => {
    return (category: string, values: string[]) => {
      const searchTerm = searchTerms[category]?.toLowerCase() || ''
      if (!searchTerm) {
        return values
      }
      return values.filter((value) => value.toLowerCase().includes(searchTerm))
    }
  }, [searchTerms])

  return {
    expandedCategories,
    searchTerms,
    toggleCategory,
    handleSearchTermChange,
    getFilteredValues,
    isSidebarOpen,
    setIsSidebarOpen,
  }
}
