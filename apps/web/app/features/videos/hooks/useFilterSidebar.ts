import type { Filters } from '@shared/types/vector'
import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export const useFilterSidebar = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const getFiltersFromURL = useCallback(() => {
    const filters: Record<string, string[]> = {}
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const category = key.replace('filter_', '') as keyof Filters
        filters[category] = value
          .split(',')
          .map((v) => v.trim())
          .map((v) => v.replace(/\s*\(.*\)/, '')) 
          .filter(Boolean)
      }
    })
    return filters
  }, [searchParams])

  const syncFiltersToURL = useCallback(
    (filters: Record<string, string[]>) => {
      const params = new URLSearchParams(searchParams)

      Array.from(params.keys()).forEach((key) => {
        if (key.startsWith('filter_')) {
          params.delete(key)
        }
      })

      Object.entries(filters).forEach(([category, values]) => {
        if (values.length > 0) {
          params.set(`filter_${category}`, values.join(','))
        }
      })

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

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
    getFiltersFromURL,
    syncFiltersToURL,
  }
}
