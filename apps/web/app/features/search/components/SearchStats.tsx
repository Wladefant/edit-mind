import { Clock, Zap, FileSearch } from 'lucide-react'
import type { SimpleSearchStats } from '@shared/types/search'
import type { JSX } from 'react'
import { humanizeSeconds } from '~/features/shared/utils/duration'

interface SearchStatsProps {
  stats: SimpleSearchStats
  resultsCount: number
}

export function SearchStats({ stats, resultsCount }: SearchStatsProps) {

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <FileSearch size={16} />
        <span>
          <strong className="text-black dark:text-white">{resultsCount}</strong> results
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Clock size={16} />
        <span title={`Search duration: ${humanizeSeconds(stats.durationMs / 1000)}`}>
          {stats.durationMs <= 1000 ? `${stats.durationMs} ms` : humanizeSeconds(stats.durationMs / 1000)}
        </span>
      </div>
    </div>
  )
}
