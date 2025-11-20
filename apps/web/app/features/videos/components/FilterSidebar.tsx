import React, { useEffect } from 'react'
import { ChevronDown, ChevronLeft, Home, MessageSquare, MoreHorizontal, SlidersHorizontal, SearchIcon, Users } from 'lucide-react'
import { useFilterSidebar } from '~/features/videos/hooks/useFilterSidebar'
import { FilterGroup } from './FilterGroup'
import { Link } from '../../shared/components/Link'
import type { Filters } from '@shared/types/vector'
import { useSession } from '~/features/auth/hooks/useSession'

interface FilterSidebarProps {
  filters: Filters | never[]
  selectedFilters: Record<string, string[]>
  onFilterChange: (filters: Record<string, string[]>) => void
  onClose: () => void
  isCollapsed: boolean
  setIsCollapsed: (v: boolean) => void
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    cameras: 'Cameras',
    colors: 'Colors',
    locations: 'Locations',
    faces: 'People',
    objects: 'Objects',
    shotTypes: 'Shot Types',
    emotions: 'Emotions',
  }
  return labels[category] || category
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  selectedFilters,
  onFilterChange,
  isCollapsed = false,
  setIsCollapsed,
}) => {
  const { session } = useSession()

  const {
    expandedCategories,
    searchTerms,
    toggleCategory,
    handleSearchTermChange,
    getFilteredValues,
    isSidebarOpen,
    setIsSidebarOpen,
    getFiltersFromURL,
    syncFiltersToURL,
  } = useFilterSidebar()

  useEffect(() => {
    const urlFilters = getFiltersFromURL()
    if (Object.keys(urlFilters).length > 0) {
      onFilterChange(urlFilters)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const handleFilterChange = (category: string, value: string) => {
    const newFilters = { ...selectedFilters }
    if (!newFilters[category]) {
      newFilters[category] = []
    }

    if (newFilters[category].includes(value)) {
      newFilters[category] = newFilters[category].filter((item) => item !== value)
    } else {
      newFilters[category].push(value)
    }

    if (newFilters[category].length === 0) {
      delete newFilters[category]
    }

    onFilterChange(newFilters)
    syncFiltersToURL(newFilters)
  }

  const clearCategory = (category: string) => {
    const newFilters = { ...selectedFilters }
    delete newFilters[category]
    onFilterChange(newFilters)
    syncFiltersToURL(newFilters)
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-50
        ${isCollapsed ? 'w-16' : 'w-72'}
        backdrop-blur-xl bg-white/60 dark:bg-black/40
        border-r border-gray-200 dark:border-white/10
        flex flex-col transition-all duration-300 ease-out shadow-sm
      `}
    >
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <>
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {session.user?.email?.charAt(0).toUpperCase() || 'E'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                  {session.user?.email}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <nav className="shrink-0 p-4 space-y-1">
        <Link isCollapsed={isCollapsed} icon={<Home className="w-5 h-5" />} to="/app/home" label="Home" />
        <Link isCollapsed={isCollapsed} icon={<SearchIcon className="w-5 h-5" />} to="/app/search" label="Search" />
        <Link
          isCollapsed={isCollapsed}
          icon={<MessageSquare className="w-5 h-5" />}
          to="/app/prompt"
          label="New Chat"
        />
        <Link
          isCollapsed={isCollapsed}
          icon={<Users className="w-5 h-5" />}
          to="/app/training"
          label="Face Training"
        />

        <button
          onClick={() => {
            setIsCollapsed(false)
            setIsSidebarOpen(!isSidebarOpen)
          }}
          className={`w-full  ${!isCollapsed ? 'pr-2' : ''} cursor-pointer rounded-lg flex justify-between items-center text-left text-black hover:text-white dark:text-white hover:bg-gray-50 transition-colors dark:hover:bg-gray-200 dark:hover:text-black`}
        >
          <span className="truncate text-inherit flex items-center  gap-3 px-2 py-2">
            <SlidersHorizontal className="w-5 h-5" />
            {!isCollapsed && 'Filters'}
          </span>
          {!isCollapsed && (
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-300 text-inherit ${isSidebarOpen ? 'transform rotate-180' : ''}`}
            />
          )}
        </button>
      </nav>

      {!isCollapsed && isSidebarOpen && (
        <div className="flex-1 overflow-y-auto p-4">
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
      )}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-white/10">
        <Link
          isCollapsed={isCollapsed}
          icon={<MoreHorizontal className="w-5 h-5" />}
          to={`/app/settings`}
          label={'Settings'}
        />
      </div>
    </aside>
  )
}