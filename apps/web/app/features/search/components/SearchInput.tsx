import { Search, X, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchSuggestions } from './SearchSuggestions'
import { useVideoSearch } from '../hooks/useVideoSearch'

interface SearchInputProps {
  onFocus?: () => void
  onBlur?: () => void
  isFocused?: boolean
  placeholder?: string
  autoFocus?: boolean
    search: ReturnType<typeof useVideoSearch>

}

export function SearchInput({
  onFocus,
  onBlur,
  isFocused = false,
  placeholder = 'Search for anything...',
  autoFocus = false,
  search
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    query,
    setQuery,
    isLoading,
    performSearch,
    clearSearch,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    handleSuggestionSelect,
    fetchSuggestions,
  } = search

  useEffect(() => {
    if (isFocused && query) {
      fetchSuggestions(query)
    }
  }, [query, isFocused, fetchSuggestions])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur()
        setShowSuggestions(false)
        onBlur?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFocused, onBlur, setShowSuggestions])

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim() && !isLoading) {
      e.preventDefault()
      performSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleFocus = () => {
    onFocus?.()
    if (query.length >= 2 && Object.keys(suggestions).length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    onBlur?.()
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const hasSuggestions = Object.keys(suggestions).length > 0

  return (
    <div className="relative w-full z-500">
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
              ? 'bg-white/15 border-white/30 shadow-[0_0_60px_rgba(255,255,255,0.15),0_20px_40px_rgba(0,0,0,0.3)]'
              : 'bg-white/8 border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/12 hover:border-white/20'
          }
        `}
      >
        <Search
          size={22}
          className={`${isFocused ? 'text-white' : 'text-gray-400'} transition-colors duration-300 shrink-0`}
          strokeWidth={2}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-base md:text-lg text-white placeholder-gray-500 font-light tracking-wide"
          autoComplete="off"
          spellCheck="false"
        />

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

        {isFocused && query && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden z-300 md:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10"
          >
            <kbd className="text-xs text-gray-400 font-medium">Enter</kbd>
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
              <Loader2 size={20} className="text-white animate-spin" />
            </motion.div>
          )}

          {query && !isLoading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={clearSearch}
              className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
              aria-label="Clear search"
            >
              <X size={18} className="text-gray-400 hover:text-white transition-colors" strokeWidth={2} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {isFocused && hasSuggestions && showSuggestions && (
        <SearchSuggestions 
          suggestions={suggestions} 
          onSelect={handleSuggestionSelect} 
          isVisible={showSuggestions} 
        />
      )}
    </div>
  )
}