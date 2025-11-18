import React from 'react'
import type { Scene } from '@shared/schemas'
import { Check } from 'lucide-react'

interface VideoResultsProps {
  scenes: Scene[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
}

export const VideoResults: React.FC<VideoResultsProps> = ({ scenes, selectedScenes, handleSelectScene }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {scenes.map((scene) => (
        <div
          key={scene.id}
          className="group relative cursor-pointer rounded-xl overflow-hidden border transition-all duration-300"
          onClick={() => handleSelectScene(scene.id)}
        >
          <div
            className={`relative w-full h-48 bg-black transition-all duration-300 ${
              selectedScenes.has(scene.id)
                ? 'ring-4 ring-white scale-95'
                : 'ring-1 ring-white/10 hover:ring-white/30 hover:scale-105'
            }`}
          >
            <img
              src={scene.thumbnailUrl ? `/thumbnails/${scene.thumbnailUrl}` : undefined}
              alt={`Scene from ${scene.id}`}
              className="w-full h-full object-cover"
            />

            {selectedScenes.has(scene.id) && (
              <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                <Check className="w-5 h-5 text-black" strokeWidth={3} />
              </div>
            )}

            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 text-white text-sm font-medium truncate">
              {scene.source}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
