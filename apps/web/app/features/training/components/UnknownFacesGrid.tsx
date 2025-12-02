import React from 'react'
import type { UnknownFace } from '@shared/types/face'
import { Check, X } from 'lucide-react'
import { Pagination } from './Pagination'

interface UnknownFacesGridProps {
  unknownFaces: UnknownFace[]
  selectedFaces: Set<string>
  handleSelectFace: (image_hash: string) => void
  handleDeleteUnknownFace: (face: UnknownFace) => void
  pagination: {
    total: number
    page: number
    totalPages: number
    hasMore: boolean
  }
  onPageChange: (page: number) => void
}

export const UnknownFacesGrid: React.FC<UnknownFacesGridProps> = ({
  unknownFaces,
  selectedFaces,
  handleSelectFace,
  handleDeleteUnknownFace,
  pagination,
  onPageChange,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        {unknownFaces.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No unknown faces found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {unknownFaces.map((face) => (
              <div
                key={face.image_hash}
                className="group relative aspect-3/4 cursor-pointer"
                onClick={() => handleSelectFace(face.image_hash)}
              >
                <div
                  className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-300 ${
                    selectedFaces.has(face.image_hash)
                      ? 'ring-4 ring-white scale-95'
                      : 'ring-1 ring-white/10 hover:ring-white/30 hover:scale-105'
                  }`}
                >
                  <img
                    src={`/unknown_faces/${face.image_file}`}
                    alt={`Unknown face ${face.image_hash}`}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {selectedFaces.has(face.image_hash) && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                      <Check className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUnknownFace(face)
                    }}
                    className="absolute top-3 left-3 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-500"
                    title="Delete face"
                  >
                    <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-medium text-white truncate">{face.video_name}</p>
                    <p className="text-xs text-gray-400">{face.formatted_timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        onPageChange={onPageChange}
        itemsPerPage={40}
      />
    </div>
  )
}
