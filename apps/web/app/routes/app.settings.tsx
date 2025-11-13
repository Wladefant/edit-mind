import { Link } from 'react-router-dom'
import { Folder as FolderIcon, Plus, Trash2, HardDrive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { Sidebar } from '~/components/dashboard/Sidebar'
import { useLoaderData, type MetaFunction } from 'react-router'
import { AddFolder } from '~/components/AddFolder'
import { DeleteFolder } from '~/components/DeleteFolder'
import { prisma } from '~/services/database'
import type { Folder, FolderStatus } from '@prisma/client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export async function loader() {
  try {
    const folders = await prisma.folder.findMany({
      include: {
        jobs: {
          select: {
            fileSize: true
          }
        }
      }
    })
    return { folders }
  } catch (error) {
    console.error(error)
    return null
  }
}

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>()
  const [folders, setFolders] = useState<Folder[]>(data?.folders)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)

  const handleOpenAddModal = () => {
    setShowAddModal(true)
  }

  const handleOpenDeleteModal = (folder: Folder) => {
    setSelectedFolder(folder)
    setShowDeleteModal(true)
  }

  const handleAddFolder = async (path: string) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })

      if (!response.ok) throw new Error('Failed to add folder')

      const data = await response.json()
      const { folder } = data

      setFolders((prev) => [...prev, folder])

      return true
    } catch (error) {
      console.error('Failed to add folder:', error)
      return false
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete folder')

      setFolders((prev) => prev.filter((f) => f.id !== folderId))
      return true
    } catch (error) {
      console.error('Failed to delete folder:', error)
      return false
    }
  }

  const handleRescan = async (id: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'scanning' as FolderStatus } : f)))

    try {
      // Call backend API to rescan folder
      await fetch(`/api/folders/${id}/rescan`, { method: 'POST' })

      // Simulate scanning completion
      setTimeout(() => {
        setFolders((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'indexed' as FolderStatus, lastScanned: 'Just now' } : f))
        )
      }, 3000)
    } catch (error) {
      console.error('Failed to rescan folder:', error)
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'error' as FolderStatus } : f)))
    }
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
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-8 py-16">
        <header className="mb-12">
          <h1 className="text-5xl font-semibold text-black dark:text-white mb-2">Settings</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Manage video folders to scan and index</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: <FolderIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              label: 'Total Folders',
              value: folders.length,
              bg: 'bg-transparent',
            },
            {
              icon: <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />,
              label: 'Videos Scanned',
              value: folders.reduce((acc, f) => acc + (f.videoCount || 0), 0),
              bg: 'bg-transparent',
            },
            {
              icon: <HardDrive className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
              label: 'Total Size',
              value: folders.reduce((acc, f) => acc + (f.size || 0), 0).toFixed(1) + ' GB',
              bg: 'bg-transparent',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-6 rounded-2xl shadow-sm ${stat.bg} border border-gray-200 dark:border-gray-800`}
            >
              <div className="p-3 rounded-full bg-transparent border border-white/20">{stat.icon}</div>
              <div>
                <p className="text-base text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-semibold text-black dark:text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-transparent rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-8 py-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-white">Video Folders</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add folders to automatically scan and index videos
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-80 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Folder
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence mode="popLayout">
              {folders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-8 py-16 text-center"
                >
                  <FolderIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
                  <p className="text-lg text-gray-500 dark:text-gray-400">No folders added yet</p>
                  <p className="text-sm text-gray-400">Add your first folder to start indexing videos</p>
                </motion.div>
              ) : (
                folders.map((folder) => {
                  const isIndexed = folder.status === 'indexed'
                  return (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className="px-8 py-5 hover:bg-white/10 hover:text-black transition-colors rounded-b-3xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 mt-1">
                          <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-black dark:text-white truncate">
                                {folder.path.split('/').pop()}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                                {folder.path}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent rounded-full shrink-0 text-sm">
                              {getStatusIcon(folder.status)}
                              <span className="text-gray-600 dark:text-gray-300">{getStatusText(folder.status)}</span>
                            </div>
                          </div>
                          {isIndexed && (
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                              <span>{folder.videoCount} videos</span>
                              <span>•</span>
                              <span>{folder.size}</span>
                              <span>•</span>
                              <span>Updated {folder.lastScanned?.toDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <Link
                              to={`/app/folders/${folder.id}/status`}
                              className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                            >
                              View Status
                            </Link>
                            {isIndexed && (
                              <button
                                onClick={() => handleRescan(folder.id)}
                                className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                              >
                                Rescan
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDeleteModal(folder)}
                              disabled={folder.status === 'scanning'}
                              className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        <p className="text-base text-gray-400 text-center mt-6">
          Videos are indexed automatically when folders are added or modified
        </p>
      </main>

      <AddFolder isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddFolder} />

      <DeleteFolder
        isOpen={showDeleteModal}
        folder={selectedFolder}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedFolder(null)
        }}
        onDelete={handleDeleteFolder}
      />
    </DashboardLayout>
  )
}
