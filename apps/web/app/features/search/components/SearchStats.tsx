import { Clock, Zap, FileSearch } from 'lucide-react'
import type { SearchStats } from '@shared/types/search'
import type { JSX } from 'react'

interface SearchStatsProps {
  stats: SearchStats
  resultsCount: number
}

export function SearchStats({ stats, resultsCount }: SearchStatsProps) {
  const performanceMap: Record<string, { color: string; icon: JSX.Element }> = {
    excellent: { color: 'text-green-500', icon: <Zap size={16} className="text-green-500" /> },
    good: { color: 'text-blue-500', icon: <Zap size={16} className="text-blue-500" /> },
    fair: { color: 'text-yellow-500', icon: <Clock size={16} className="text-yellow-500" /> },
    poor: { color: 'text-red-500', icon: <Clock size={16} className="text-red-500" /> },
    default: { color: 'text-gray-400', icon: <Clock size={16} className="text-gray-400" /> },
  }

  const { color, icon } = performanceMap[stats.performance.rating] || performanceMap.default

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <FileSearch size={16} />
        <span>
          <strong className="text-black dark:text-white">{resultsCount}</strong> results
        </span>
      </div>

      <div className="flex items-center gap-2">
        {icon}
        <span className={`${color}`} title={`Search duration: ${stats.durationMs}ms`}>
          {stats.durationMs}ms
        </span>
      </div>

      {stats.complexity.level !== 'simple' && (
        <div className="px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 capitalize">
            {stats.complexity.level} search
          </span>
        </div>
      )}

      {stats.complexity.factors.length > 0 && (
        <div className="group relative">
          <span
            className="text-xs text-gray-400 cursor-help"
            aria-label="Search filters"
            tabIndex={0}
          >
            {stats.complexity.factors.length} filters
          </span>
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
            <div
              className="bg-black/95 text-white text-xs rounded-lg p-3 shadow-xl min-w-[200px]"
              role="tooltip"
            >
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
