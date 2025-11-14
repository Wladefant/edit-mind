import { Search, Sparkles, X, TrendingUp, Clock, Film } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchResult {
  id: string
  title: string
  type: 'movie' | 'series' | 'documentary' | 'person' | 'genre'
  thumbnail?: string
  year?: string
  rating?: string
  metadata?: string
  duration?: string
  matchType?: 'title' | 'transcript' | 'face' | 'object' | 'scene'
  matchConfidence?: number
  timestamp?: string // For matching specific moments in videos
}

const TRENDING_SEARCHES = [
  'Action movies',
  'Comedies from the 90s',
  'Shows like Breaking Bad',
  'Christopher Nolan films',
]

const RECENT_SEARCHES = [
  'Inception',
  'Sci-fi documentaries',
  'Tom Hanks movies',
]

const MOCK_RESULTS: SearchResult[] = [
  { 
    id: '1', 
    title: 'Inception', 
    type: 'movie', 
    year: '2010', 
    rating: '8.8', 
    metadata: 'Sci-Fi • Thriller',
    duration: '2h 28m',
    matchType: 'title',
    matchConfidence: 98
  },
  { 
    id: '2', 
    title: 'The Dark Knight', 
    type: 'movie', 
    year: '2008', 
    rating: '9.0', 
    metadata: 'Action • Crime',
    duration: '2h 32m',
    matchType: 'face',
    matchConfidence: 95,
    timestamp: '00:45:23'
  },
  { 
    id: '3', 
    title: 'Stranger Things', 
    type: 'series', 
    year: '2016', 
    rating: '8.7', 
    metadata: 'Drama • Fantasy',
    duration: '4 seasons',
    matchType: 'transcript',
    matchConfidence: 87
  },
  {
    id: '4',
    title: 'Planet Earth II',
    type: 'documentary',
    year: '2016',
    rating: '9.5',
    metadata: 'Nature • Wildlife',
    duration: '6 episodes',
    matchType: 'object',
    matchConfidence: 92
  },
]

const TYPE_ICONS = {
  movie: '🎬',
  series: '📺',
  documentary: '🎥',
  person: '👤',
  genre: '🎭',
}

const MATCH_TYPE_LABELS = {
  title: 'Title match',
  transcript: 'Spoken content',
  face: 'Person detected',
  object: 'Object detected',
  scene: 'Scene match'
}

export function SearchInput() {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Simulate AI search
  useEffect(() => {
    if (query.length > 2) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setResults(MOCK_RESULTS.filter((r) => r.title.toLowerCase().includes(query.toLowerCase())))
        setIsLoading(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setResults([])
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && isFocused) {
        setIsFocused(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFocused])

  const handleClear = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const handleResultClick = (result: SearchResult) => {
    console.log('Selected:', result)
    setQuery('')
    setResults([])
    setIsFocused(false)
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Overlay when focused */}
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

      {/* Search Container */}
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-6 relative z-50">
        <div className="max-w-4xl mx-auto" ref={searchContainerRef}>
          {/* Hero Section */}
          <AnimatePresence mode="wait">
            {!isFocused && query === '' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center mb-10 md:mb-14"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-5 tracking-tight leading-tight">
                    What you're looking for?
                  </h1>
                  <p className="text-lg md:text-xl text-gray-400 font-light">
                    Search by face, object, location, or even what was said
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            layout 
            className="relative"
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              layout
              animate={{
                scale: isFocused ? 1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className={`
                relative flex items-center gap-3 md:gap-4 px-4 md:px-7 py-4 md:py-6 rounded-2xl md:rounded-3xl
                backdrop-blur-xl border transition-all duration-500
                ${
                  isFocused
                    ? 'bg-white/[0.15] border-white/30 shadow-[0_0_60px_rgba(255,255,255,0.15),0_20px_40px_rgba(0,0,0,0.3)]'
                    : 'bg-white/[0.08] border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/[0.12] hover:border-white/20'
                }
              `}
            >
              <Search 
                size={22} 
                className={`${isFocused ? 'text-white' : 'text-gray-400'} transition-colors duration-300 flex-shrink-0`} 
                strokeWidth={2}
              />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="Search for anything..."
                className="flex-1 bg-transparent border-none outline-none text-base md:text-lg text-white placeholder-gray-500 font-light tracking-wide"
                autoComplete="off"
                spellCheck="false"
              />

              {/* Keyboard Shortcut Hint */}
              {!isFocused && !query && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10"
                >
                  <kbd className="text-xs text-gray-400 font-medium">⌘</kbd>
                  <kbd className="text-xs text-gray-400 font-medium">K</kbd>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </motion.div>
                )}

                {query && !isLoading && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleClear}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
                  >
                    <X size={18} className="text-gray-400 hover:text-white transition-colors" strokeWidth={2} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Dropdown Results/Suggestions */}
            <AnimatePresence>
              {isFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-full mt-3 md:mt-4 bg-[#1a1a1a]/98 backdrop-blur-3xl rounded-2xl md:rounded-3xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden"
                >
                  {query === '' && (
                    <div className="p-3 md:p-5">
                      {/* Recent Searches */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <Clock size={13} strokeWidth={2.5} />
                          Recent
                        </div>
                        <div className="space-y-0.5">
                          {RECENT_SEARCHES.map((search, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => setQuery(search)}
                              className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group active:scale-[0.98]"
                            >
                              <Clock size={15} className="text-gray-600 group-hover:text-gray-400 transition-colors" strokeWidth={2} />
                              <span className="text-sm md:text-base text-gray-300 group-hover:text-white transition-colors font-light">
                                {search}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Trending Searches */}
                      <div>
                        <div className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <TrendingUp size={13} strokeWidth={2.5} />
                          Trending
                        </div>
                        <div className="space-y-0.5">
                          {TRENDING_SEARCHES.map((search, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (RECENT_SEARCHES.length + i) * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => setQuery(search)}
                              className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl hover:bg-white/[0.06] transition-all duration-200 group active:scale-[0.98]"
                            >
                              <Sparkles size={15} className="text-gray-600 group-hover:text-yellow-400 transition-colors" strokeWidth={2} />
                              <span className="text-sm md:text-base text-gray-300 group-hover:text-white transition-colors font-light">
                                {search}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Results with AI Intelligence */}
                  {results.length > 0 && (
                    <div className="p-3 md:p-5">
                      <div className="flex items-center justify-between px-3 md:px-4 py-2 mb-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {results.length} {results.length === 1 ? 'Result' : 'Results'}
                        </div>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          {showAdvanced ? 'Hide' : 'Show'} details
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {results.map((result, i) => (
                          <motion.button
                            key={result.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 md:py-4 rounded-xl md:rounded-2xl hover:bg-white/[0.06] transition-all duration-200 group active:scale-[0.98]"
                          >
                            {/* Thumbnail/Icon */}
                            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 overflow-hidden border border-white/5">
                              {result.thumbnail ? (
                                <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                              ) : (
                                TYPE_ICONS[result.type]
                              )}
                              {/* Match Type Badge */}
                              {showAdvanced && result.matchType && (
                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm">
                                  <span className="text-[9px] text-green-400 font-semibold uppercase tracking-wide">
                                    {result.matchConfidence}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Content Info */}
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate text-sm md:text-base">
                                  {result.title}
                                </h3>
                                {result.year && (
                                  <span className="text-xs md:text-sm text-gray-500 flex-shrink-0">{result.year}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {result.metadata && (
                                  <span className="text-xs md:text-sm text-gray-400">{result.metadata}</span>
                                )}
                                {result.duration && (
                                  <>
                                    <span className="text-gray-700">•</span>
                                    <span className="text-xs md:text-sm text-gray-500">{result.duration}</span>
                                  </>
                                )}
                                {result.rating && (
                                  <>
                                    <span className="text-gray-700">•</span>
                                    <span className="text-xs md:text-sm text-yellow-500 font-semibold flex items-center gap-0.5">
                                      ⭐ {result.rating}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* AI Match Information */}
                              {showAdvanced && result.matchType && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-[10px] md:text-xs text-blue-400 font-medium">
                                      {MATCH_TYPE_LABELS[result.matchType]}
                                    </span>
                                  </div>
                                  {result.timestamp && (
                                    <span className="text-[10px] md:text-xs text-gray-600">at {result.timestamp}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Arrow Indicator */}
                            <div className="text-gray-700 group-hover:text-white transition-colors flex-shrink-0 text-lg">
                              →
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results State */}
                  {query.length > 2 && results.length === 0 && !isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 text-center"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
                        <Film size={28} className="text-black" strokeWidth={1.5} />
                      </div>
                      <p className="text-white mb-1">No results found for "{query}"</p>
                      <p className="truncate">Try searching with different keywords</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Quick Genre Pills */}
          {!isFocused && query === '' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap gap-2 md:gap-3 justify-center mt-8 md:mt-10"
            >
              {['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Documentary', 'Animation'].map((genre, i) => (
                <motion.button
                  key={genre}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setQuery(genre)
                    inputRef.current?.focus()
                  }}
                  className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-gray-300 hover:text-white text-xs md:text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                >
                  {genre}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}