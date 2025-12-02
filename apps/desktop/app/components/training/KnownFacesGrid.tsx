import React from 'react';
import { KnownFace } from '@/lib/types/face';
import { UserPlus } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';

interface KnownFacesGridProps {
  knownFaces: KnownFace[];
}

export const KnownFacesGrid: React.FC<KnownFacesGridProps> = ({ knownFaces }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {knownFaces.map((face) => (
        <div key={face.name} className="border rounded-lg overflow-hidden">
          {face.images.length > 0 ? (
            <img src={`face://${face.images[0]}`} alt={face.name} className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-40 bg-muted flex items-center justify-center">
              <UserPlus className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="p-3 bg-background">
            <p className="font-medium truncate">{face.name}</p>
            <Badge variant="secondary" className="mt-1">
              {face.images.length} samples
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};
