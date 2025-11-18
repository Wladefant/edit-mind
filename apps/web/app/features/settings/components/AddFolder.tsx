import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, Plus, Loader2, X, ChevronRight } from 'lucide-react'

interface ServerFolder {
  path: string
  name: string
  isDirectory: boolean
  children?: ServerFolder[]
}

interface AddFolderProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (path: string) => Promise<boolean>
}

export function AddFolder({ isOpen, onClose, onAdd }: AddFolderProps) {
  const [availableFolders, setAvailableFolders] = useState<ServerFolder[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedPath, setSelectedPath] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchAvailableFolders = async (path: string = '/') => {
    setLoadingFolders(true)
    try {
      const response = await fetch(`/api/folders?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      setAvailableFolders(data.folders || [])
      setCurrentPath(path)
    } catch (error) {
      console.error(error)
      setAvailableFolders([])
    } finally {
      setLoadingFolders(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedPath('')
      setCurrentPath('/')
      fetchAvailableFolders('/')
    }
  }, [isOpen])

  const handleNavigateToFolder = (folderPath: string) => {
    fetchAvailableFolders(folderPath)
  }

  const handleSelectFolder = (folderPath: string) => {
    setSelectedPath(folderPath)
  }

  const handleAddFolder = async () => {
    if (!selectedPath) return
    setIsAdding(true)
    const success = await onAdd(selectedPath)
    setIsAdding(false)
    if (success) onClose()
  }

  const getBreadcrumbs = () => {
    if (currentPath === '/') return [{ name: 'Root', path: '/' }]
    const parts = currentPath.split('/').filter(Boolean)
    return [
      { name: 'Root', path: '/' },
      ...parts.map((part, idx) => ({
        name: part,
        path: '/' + parts.slice(0, idx + 1).join('/'),
      })),
    ]
  }

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
            className="bg-white dark:bg-black rounded-xl shadow-lg max-w-xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">Add Folder</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Select a folder from server</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto text-sm text-gray-600 dark:text-gray-400">
              {getBreadcrumbs().map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-1">
                  <button
                    onClick={() => handleNavigateToFolder(crumb.path)}
                    className="whitespace-nowrap hover:text-black dark:hover:text-white transition-colors"
                  >
                    {crumb.name}
                  </button>
                  {idx < getBreadcrumbs().length - 1 && <ChevronRight className="w-3 h-3" />}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
                </div>
              ) : availableFolders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Folder className="w-10 h-10 mx-auto mb-3" />
                  No folders found
                </div>
              ) : (
                availableFolders.map((folder) => (
                  <motion.div
                    key={folder.path}
                    layout
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPath === folder.path ? 'bg-white/20' : ''
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 w-full"
                      onClick={() => folder.isDirectory && handleNavigateToFolder(folder.path)}
                    >
                      <Folder className="w-5 h-5 text-black dark:text-white shrink-0" />
                      <span className="text-sm text-black dark:text-white truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectFolder(folder.path)
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedPath === folder.path
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {selectedPath === folder.path ? 'Selected' : 'Select'}
                      </button>
                      {folder.isDirectory && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {selectedPath && (
              <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 truncate">
                Selected: <span className="font-mono text-black dark:text-white">{selectedPath}</span>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!selectedPath || isAdding}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add
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
