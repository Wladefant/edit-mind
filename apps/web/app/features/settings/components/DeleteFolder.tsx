import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trash2 } from 'lucide-react'
import type { Folder } from '@prisma/client'

interface DeleteFolderProps {
  isOpen: boolean
  folder: Folder | null
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
          className="fixed inset-0 bg-black/5  flex items-center justify-center z-500 backdrop-blur-lg  p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/5 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-800">
              <div className="p-3 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Remove Folder</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to remove this folder from indexing?
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="p-4 bg-white/5 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-black dark:text-white truncate">
                  {folder.path.split('/').pop()}
                </p>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">{folder.path}</p>
                {folder.videoCount !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{folder.videoCount} videos</p>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Removing this folder will stop indexing new videos. Existing videos in your system will remain intact.
              </p>
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center cursor-pointer justify-center gap-2 px-5 py-2 bg-red-600 dark:bg-red-500 text-white rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
