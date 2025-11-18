import { FileSearch, FolderPlus } from 'lucide-react'

interface EmptyStateProps {
  hasQuery: boolean
  query?: string
}

export function EmptyState({ hasQuery, query }: EmptyStateProps) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
          <FileSearch size={32} className="text-gray-400" />
        </div>
        <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No results found</h4>
        <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
          We couldn't find any videos matching "<strong>{query}</strong>". Try different keywords or filters.
        </p>
        <div className="flex flex-col gap-2 text-sm text-gray-500">
          <p>Try searching for:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>People's names (@John, @Sarah)</li>
            <li>Activities (coding, meeting, presentation)</li>
            <li>Objects (laptop, whiteboard, car)</li>
            <li>Locations (city name or country name)</li>
            <li>What was said ("let's do this")</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6">
        <FolderPlus size={32} className="text-gray-400" />
      </div>
      <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No videos indexed yet</h4>
      <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
        Start by adding your video folders in settings to begin searching.
      </p>
    </div>
  )
}
