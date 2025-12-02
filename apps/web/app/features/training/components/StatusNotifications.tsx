import React from 'react'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface MatchingStatus {
  isMatching: boolean
  progress: number
  matchesFound: number
  currentPerson: string
  error: string | null
}

interface StatusNotificationsProps {
  matchingStatus: MatchingStatus
  successMessage: string | null
  onDismissSuccess: () => void
  onDismissError: () => void
}

export const StatusNotifications: React.FC<StatusNotificationsProps> = ({
  matchingStatus,
  successMessage,
  onDismissSuccess,
  onDismissError,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {successMessage && (
        <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">Success</h4>
              <p className="text-sm text-gray-300">{successMessage}</p>
            </div>
            <button
              onClick={onDismissSuccess}
              className="shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {matchingStatus.error && (
        <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">Error</h4>
              <p className="text-sm text-gray-300">{matchingStatus.error}</p>
            </div>
            <button
              onClick={onDismissError}
              className="shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {matchingStatus.isMatching && (
        <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-2">
                Finding Similar Faces
              </h4>
              <p className="text-sm text-gray-300 mb-3">
                Searching for faces matching "{matchingStatus.currentPerson}"
              </p>
              
              <div className="relative h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${matchingStatus.progress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {Math.round(matchingStatus.progress)}% complete
                </span>
                {matchingStatus.matchesFound > 0 && (
                  <span className="text-xs font-medium text-blue-400">
                    {matchingStatus.matchesFound} matches found
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}