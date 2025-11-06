import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Folder, Plus, Trash2, HardDrive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import type { MetaFunction } from 'react-router'

export async function loader() {}

type FolderStatus = 'idle' | 'scanning' | 'indexed' | 'error'

interface VideoFolder {
  id: string
  path: string
  status: FolderStatus
  videoCount?: number
  lastScanned?: string
  size?: string
}

export const meta: MetaFunction = () => {
  return [{ title: 'Settings | Edit Mind' }]
}

export default function SettingsPage() {
  const [folders, setFolders] = useState<VideoFolder[]>([
    {
      id: '1',
      path: '/Users/username/Videos/Projects',
      status: 'indexed',
      videoCount: 142,
      lastScanned: '2 hours ago',
      size: '45.2 GB',
    },
    {
      id: '2',
      path: '/Users/username/Documents/Footage',
      status: 'scanning',
      videoCount: 89,
      size: '23.1 GB',
    },
  ])

  const [isAdding, setIsAdding] = useState(false)

  const handleAddFolder = () => {
    // In a real app, this would open a folder picker dialog
    setIsAdding(true)

    setTimeout(() => {
      const newFolder: VideoFolder = {
        id: Date.now().toString(),
        path: '/Users/username/Desktop/NewVideos',
        status: 'scanning',
      }
      setFolders((prev) => [...prev, newFolder])
      setIsAdding(false)

      // Simulate scanning completion
      setTimeout(() => {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === newFolder.id
              ? { ...f, status: 'indexed', videoCount: 56, lastScanned: 'Just now', size: '12.4 GB' }
              : f
          )
        )
      }, 3000)
    }, 500)
  }

  const handleRemoveFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id))
  }

  const handleRescan = (id: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'scanning' as FolderStatus } : f)))

    setTimeout(() => {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'indexed', lastScanned: 'Just now' } : f)))
    }, 2000)
  }

  const getStatusIcon = (status: FolderStatus) => {
    switch (status) {
      case 'scanning':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
      case 'indexed':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return null
    }
  }

  const getStatusText = (status: FolderStatus) => {
    switch (status) {
      case 'scanning':
        return 'Scanning...'
      case 'indexed':
        return 'Indexed'
      case 'error':
        return 'Error'
      default:
        return 'Idle'
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-neutral-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-semibold text-black dark:text-white mb-2">Settings</h1>
            <p className="text-[17px] text-black/60 dark:text-white/60">Manage video folders to scan and index</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                  <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[13px] font-medium text-black/60 dark:text-white/60">Total Folders</span>
              </div>
              <p className="text-3xl font-semibold text-black dark:text-white">{folders.length}</p>
            </div>

            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-[13px] font-medium text-black/60 dark:text-white/60">Videos Indexed</span>
              </div>
              <p className="text-3xl font-semibold text-black dark:text-white">
                {folders.reduce((acc, f) => acc + (f.videoCount || 0), 0)}
              </p>
            </div>

            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
                  <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-[13px] font-medium text-black/60 dark:text-white/60">Total Size</span>
              </div>
              <p className="text-3xl font-semibold text-black dark:text-white">
                {folders
                  .reduce((acc, f) => {
                    const size = parseFloat(f.size?.split(' ')[0] || '0')
                    return acc + size
                  }, 0)
                  .toFixed(1)}{' '}
                GB
              </p>
            </div>
          </div>

          {/* Folders Section */}
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-black dark:text-white mb-1">Video Folders</h2>
                  <p className="text-[15px] text-black/60 dark:text-white/60">
                    Add folders to automatically scan and index videos
                  </p>
                </div>
                <button
                  onClick={handleAddFolder}
                  disabled={isAdding}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[15px] font-medium hover:opacity-80 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Folder
                </button>
              </div>
            </div>

            {/* Folders List */}
            <div className="divide-y divide-black/5 dark:divide-white/10">
              <AnimatePresence mode="popLayout">
                {folders.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-6 py-16 text-center"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full mb-4">
                      <Folder className="w-8 h-8 text-black/30 dark:text-white/30" />
                    </div>
                    <h3 className="text-[17px] font-medium text-black dark:text-white mb-2">No folders added yet</h3>
                    <p className="text-[15px] text-black/60 dark:text-white/60">
                      Add your first folder to start indexing videos
                    </p>
                  </motion.div>
                ) : (
                  folders.map((folder) => (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      <div className="flex items-start gap-4">
                        {/* Folder Icon */}
                        <div className="flex-shrink-0 mt-1">
                          <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                            <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>

                        {/* Folder Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium text-black dark:text-white mb-1 truncate">
                                {folder.path.split('/').pop()}
                              </h3>
                              <p className="text-[13px] text-black/50 dark:text-white/50 truncate font-mono">
                                {folder.path}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/5 dark:bg-white/5 rounded-full flex-shrink-0">
                              {getStatusIcon(folder.status)}
                              <span className="text-[13px] font-medium text-black/70 dark:text-white/70">
                                {getStatusText(folder.status)}
                              </span>
                            </div>
                          </div>

                          {/* Folder Stats */}
                          {folder.status === 'indexed' && (
                            <div className="flex items-center gap-4 text-[13px] text-black/60 dark:text-white/60 mb-3">
                              <span>{folder.videoCount} videos</span>
                              <span>•</span>
                              <span>{folder.size}</span>
                              <span>•</span>
                              <span>Updated {folder.lastScanned}</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {folder.status === 'indexed' && (
                              <button
                                onClick={() => handleRescan(folder.id)}
                                className="text-[13px] font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors duration-150"
                              >
                                Rescan
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveFolder(folder.id)}
                              disabled={folder.status === 'scanning'}
                              className="flex items-center gap-1.5 text-[13px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-[13px] text-black/40 dark:text-white/40 text-center mt-6">
            Videos are indexed automatically when folders are added or modified
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
