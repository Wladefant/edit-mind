import { useState } from 'react'
import { useLoaderData, type MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { FilterSidebar } from '~/features/videos/components/FilterSidebar'
import { SearchHero } from '~/features/search/components/SearchHero'
import { SearchResultsGrid } from '~/features/search/components/SearchResultsGrid'
import { SearchStats } from '~/features/search/components/SearchStats'
import { EmptyState } from '~/features/search/components/EmptyState'
import { useVideoSearch } from '~/features/search/hooks/useVideoSearch'
import { getAllVideosWithScenes, queryCollection } from '@shared/services/vectorDb'
import { motion, AnimatePresence } from 'framer-motion'
import { getUser } from '~/services/user.sever'
import { SearchInput } from '~/features/search/components/SearchInput'
import type { SearchQuery } from '@shared/types/search'
import { generateActionFromPrompt } from '@shared/services/gemini'
import { getSearchStats } from '@shared/utils/search'
import { buildSearchQueryFromSuggestions, suggestionCache } from '@shared/services/suggestion'
import { Sidebar } from '~/features/shared/components/Sidebar'

export const meta: MetaFunction = () => {
  return [{ title: 'Search | Edit Mind' }]
}

export async function loader() {
  await suggestionCache.initialize()
  const data = await getAllVideosWithScenes(20, 0)
  if (data) {
    return { filters: data.filters }
  }
  return { filters: [] }
}

export async function action({ request }: { request: Request }) {
  try {
    const user = await getUser(request)
    const data = await request.formData()
    const query = data.get('query')?.toString()
    const suggestionsJson = data.get('suggestions')?.toString()

    if (!user) return { success: false, error: 'No user authenticated' }
    if (!query || !suggestionsJson) return { success: false, error: 'No search query provided' }

    const startTime = Date.now()

    let searchQuery: SearchQuery

    const suggestions = suggestionsJson ? JSON.parse(suggestionsJson) : {}
    const hasSuggestions = Object.keys(suggestions).length > 0

    if (hasSuggestions) {
      searchQuery = buildSearchQueryFromSuggestions(suggestions)
      console.debug('Using suggestions for search:', searchQuery)
    } else {
      searchQuery = await generateActionFromPrompt(query)
      console.debug('Generated search query from AI:', searchQuery)
    }

    const videos = await queryCollection(searchQuery)

    const duration = Date.now() - startTime

    const stats = getSearchStats({
      query: searchQuery.description || query,
      finalResultsCount: videos.length,
      durationMs: duration,
      timestamp: new Date(),
      extractedParams: suggestions,
    })

    return { success: true, videos, stats }
  } catch (error) {
    console.error('Search error:', error)
    return { success: false, error: 'Search failed' }
  }
}

export default function SearchPage() {
  const search = useVideoSearch()
  const { query, results, stats, isLoading, isError, selectedSuggestion } = search
  const { filters } = useLoaderData<typeof loader>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isFocused, setIsFocused] = useState(false)

  const hasQuery = query.length > 0 || Object.keys(selectedSuggestion).length > 0
  const hasResults = results.length > 0
  const showHero = !isFocused && !hasQuery

  return (
    <DashboardLayout
      sidebar={
        Object.values(filters).length > 0 ? (
          <FilterSidebar
            filters={filters}
            selectedFilters={selectedFilters}
            onFilterChange={setSelectedFilters}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarOpen}
            setIsCollapsed={setIsSidebarOpen}
          />
        ) : (
          <Sidebar />
        )
      }
    >
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsFocused(false)}
          />
        )}
      </AnimatePresence>

      <div className="pt-24 md:pt-32 pb-12 px-4 md:px-6 relative z-1000">
        <div className="max-w-4xl mx-auto">
          <SearchHero isVisible={showHero} />

          <SearchInput
            search={search}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            isFocused={isFocused}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-8 z-300">
        {isError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">Search failed. Please try again.</p>
          </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-12 h-12 border-4 border-white border-t-transparent rounded-full mb-4"
            />
            <p className="text-gray-500 dark:text-gray-400">Loading search results...</p>
          </div>
        )}
        {hasResults && !isLoading && (
          <>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-semibold text-black dark:text-white mb-2">Search Results</h3>
                {stats && <SearchStats stats={stats} resultsCount={results.length} />}
              </div>
            </div>

            <SearchResultsGrid videos={results} viewMode={viewMode} onViewModeChange={setViewMode} />
          </>
        )}

        {hasQuery && !hasResults && !isLoading && <EmptyState hasQuery={true} query={query} />}

        {!hasQuery && !isLoading && <EmptyState hasQuery={false} />}
      </main>
    </DashboardLayout>
  )
}
