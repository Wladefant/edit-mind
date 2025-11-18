import { Clock, Zap, FileSearch } from 'lucide-react'
import type { SearchStats } from '@shared/types/search'

interface SearchStatsProps {
  stats: SearchStats
  resultsCount: number
}

export function SearchStats({ stats, resultsCount }: SearchStatsProps) {
  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'text-green-500'
      case 'good':
        return 'text-blue-500'
      case 'fair':
        return 'text-yellow-500'
      case 'poor':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getPerformanceIcon = (rating: string) => {
    if (rating === 'excellent' || rating === 'good') {
      return <Zap size={16} className="text-green-500" />
    }
    return <Clock size={16} className="text-gray-500" />
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <FileSearch size={16} />
        <span>
          <strong className="text-black dark:text-white">{resultsCount}</strong> results
        </span>
      </div>

      <div className="flex items-center gap-2">
        {getPerformanceIcon(stats.performance.rating)}
        <span className={getPerformanceColor(stats.performance.rating)}>{stats.durationMs}ms</span>
      </div>

      {stats.complexity.level !== 'simple' && (
        <div className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium capitalize">
            {stats.complexity.level} search
          </span>
        </div>
      )}

      {stats.complexity.factors.length > 0 && (
        <div className="group relative">
          <span className="text-xs text-gray-400 cursor-help">{stats.complexity.factors.length} filters</span>
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
            <div className="bg-black/95 text-white text-xs rounded-lg p-3 shadow-xl min-w-[200px]">
              <div className="font-semibold mb-2">Search Filters:</div>
              <ul className="space-y-1">
                {stats.complexity.factors.map((factor, i) => (
                  <li key={i} className="text-gray-300">
                    • {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
