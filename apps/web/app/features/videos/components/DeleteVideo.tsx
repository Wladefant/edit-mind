import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trash2 } from 'lucide-react'

interface DeleteVideoProps {
  isOpen: boolean
  source: string
  onClose: () => void
  onDelete: (source: string) => void
}

export function DeleteVideo({ isOpen, source, onClose, onDelete }: DeleteVideoProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    onDelete(source)
  }
  
  const fileName = source.split('/').pop()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-black rounded-xl shadow-lg max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-800">
              <div className="p-3 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Delete Video</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to permanently delete this video?
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-black dark:text-white truncate">
                  {fileName}
                </p>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{source}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will delete the video file and all associated data, including scenes, analysis results, and thumbnails. This action cannot be undone.
              </p>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-red-600 dark:bg-red-500 text-white rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
