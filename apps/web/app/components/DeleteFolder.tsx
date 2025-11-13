import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trash2 } from 'lucide-react'

interface VideoFolder {
  id: string
  path: string
  status: 'idle' | 'scanning' | 'indexed' | 'error'
  videoCount?: number
  lastScanned?: string
  size?: string
}

interface DeleteFolderProps {
  isOpen: boolean
  folder: VideoFolder | null
  onClose: () => void
  onDelete: (folderId: string) => Promise<boolean>
}

export function DeleteFolder({ isOpen, folder, onClose, onDelete }: DeleteFolderProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!folder) return

    setIsDeleting(true)
    const success = await onDelete(folder.id)
    setIsDeleting(false)

    if (success) onClose()
  }

  if (!folder) return null

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
            className="bg-white dark:bg-black rounded-xl shadow-lg max-w-md w-full flex flex-col border border-gray-200 dark:border-gray-800"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-black dark:text-white">Remove Folder</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Are you sure you want to remove this folder?
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 flex-1 overflow-y-auto">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-black dark:text-white mb-1">{folder.path.split('/').pop()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{folder.path}</p>
                {folder.videoCount && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {folder.videoCount} videos • {folder.size}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                This will stop indexing videos from this folder. The videos will not be deleted from your system.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 rounded-full font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove
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
