import { ChevronDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FilterGroupProps {
  category: string
  values: string[]
  selectedValues: string[]
  isExpanded: boolean
  searchTerm: string
  onToggle: () => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: string) => void
  onClear: () => void
  getCategoryLabel: (category: string) => string
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  category,
  values,
  selectedValues,
  isExpanded,
  searchTerm,
  onToggle,
  onSearchChange,
  onFilterChange,
  onClear,
  getCategoryLabel,
}) => {
  return (
    <div className="border-b px-4 border-gray-200 dark:border-white/10 py-4">
      <button onClick={onToggle} className="w-full flex justify-between items-center text-left">
        <span className="font-semibold text-black dark:text-white">{getCategoryLabel(category)}</span>
        <ChevronDown
          size={18}
          className={`transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-3 max-h-48 overflow-y-auto pr-2">
                {values.map((value) => (
                  <div key={value} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`${category}-${value}`}
                      checked={selectedValues.includes(value)}
                      onChange={() => onFilterChange(value)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`${category}-${value}`} className="ml-3 text-sm text-gray-600 dark:text-gray-300">
                      {value}
                    </label>
                  </div>
                ))}
              </div>
              {selectedValues.length > 0 && (
                <button
                  onClick={onClear}
                  className="mt-2 text-sm truncate hover:underline flex items-center"
                >
                  <X size={14} className="mr-1" />
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
