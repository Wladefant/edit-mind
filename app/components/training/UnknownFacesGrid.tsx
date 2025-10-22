import React from 'react';
import { UnknownFace } from '@/lib/types/face';
import { Check, X } from 'lucide-react';

interface UnknownFacesGridProps {
  unknownFaces: UnknownFace[];
  selectedFaces: Set<string>;
  handleSelectFace: (image_hash: string) => void;
  handleDeleteUnknownFace: (face: UnknownFace) => void;
}

export const UnknownFacesGrid: React.FC<UnknownFacesGridProps> = ({
  unknownFaces,
  selectedFaces,
  handleSelectFace,
  handleDeleteUnknownFace,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {unknownFaces.map((face) => (
        <div
          key={face.image_hash}
          className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
            selectedFaces.has(face.image_hash)
              ? 'border-primary ring-2 ring-primary'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => handleSelectFace(face.image_hash)}
        >
          {selectedFaces.has(face.image_hash) && (
            <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteUnknownFace(face);
            }}
            className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity"
            title="Delete face"
          >
            <X className="w-4 h-4" />
          </button>

          <img
            src={`unknown://${face.image_file}`}
            alt={`Unknown face ${face.image_hash}`}
            className="w-full h-40 object-cover"
          />
          <div className="p-2 bg-background">
            <p className="text-xs text-muted-foreground truncate">Video: {face.video_name}</p>
            <p className="text-xs text-muted-foreground">Time: {face.formatted_timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
