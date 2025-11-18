import { useState, useEffect, useCallback, useRef } from 'react'
import { useFetcher } from 'react-router-dom'
import type { VideoWithScenes } from '@shared/types/video'
import type { SearchStats } from '@shared/types/search'

interface UseVideoSearchResult {
  query: string
  setQuery: (query: string) => void
  results: VideoWithScenes[]
  stats: SearchStats | null
  isLoading: boolean
  isError: boolean
  performSearch: () => void
  clearSearch: () => void
}

export function useVideoSearch(): UseVideoSearchResult {
  const fetcher = useFetcher()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoWithScenes[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  
  const lastSearchQueryRef = useRef('')

  const isLoading = fetcher.state === 'submitting' || fetcher.state === 'loading'
  const isError = fetcher.data?.success === false

  useEffect(() => {
    if (fetcher.data?.videos) {
      setResults(fetcher.data.videos)
      setStats(fetcher.data.stats || null)
    }
  }, [fetcher.data])

  const performSearch = useCallback(() => {
    if (!query.trim()) return
    
    if (lastSearchQueryRef.current === query) {
      return
    }
    
    if (fetcher.state === 'submitting' || fetcher.state === 'loading') {
      return
    }

    lastSearchQueryRef.current = query

    const formData = new FormData()
    formData.append('query', query)
    
    fetcher.submit(formData, {
      method: 'POST',
      action: '/app/search',
    })
  }, [query, fetcher])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setStats(null)
    lastSearchQueryRef.current = ''
  }, [])



  return {
    query,
    setQuery,
    results,
    stats,
    isLoading,
    isError,
    performSearch,
    clearSearch,
  }
}