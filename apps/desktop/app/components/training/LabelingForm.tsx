import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Label } from '@/app/components/ui/Label';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/Select';
import { Loader2, Check } from 'lucide-react';
import { KnownFace } from '@/lib/types/face';

interface LabelingFormProps {
  selectedFacesCount: number;
  handleSelectAll: () => void;
  labelMode: 'existing' | 'new';
  setLabelMode: (mode: 'existing' | 'new') => void;
  selectedKnownFace: string;
  setSelectedKnownFace: (name: string) => void;
  knownFaces: KnownFace[];
  newFaceName: string;
  setNewFaceName: (name: string) => void;
  handleLabelFaces: () => void;
  isLabeling: boolean;
  unknownFacesCount: number;
}

export const LabelingForm: React.FC<LabelingFormProps> = ({
  selectedFacesCount,
  handleSelectAll,
  labelMode,
  setLabelMode,
  selectedKnownFace,
  setSelectedKnownFace,
  knownFaces,
  newFaceName,
  setNewFaceName,
  handleLabelFaces,
  isLabeling,
  unknownFacesCount,
}) => {
  return (
    <div className="mb-6 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-base font-semibold">Label Selected Faces ({selectedFacesCount})</Label>
        <Button onClick={handleSelectAll} variant="outline" size="sm">
          {selectedFacesCount === unknownFacesCount ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Label Method</Label>
          <Tabs
            value={labelMode}
            onValueChange={(value) => setLabelMode(value as 'existing' | 'new')}
            className="w-full mt-2"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Use Existing Name</TabsTrigger>
              <TabsTrigger value="new">Create New Name</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {labelMode === 'existing' ? (
          <div>
            <Label htmlFor="known-face-select">Select Known Face</Label>
            <Select value={selectedKnownFace} onValueChange={setSelectedKnownFace}>
              <SelectTrigger id="known-face-select" className="mt-2">
                <SelectValue placeholder="Choose a known face..." />
              </SelectTrigger>
              <SelectContent>
                {knownFaces.map((face) => (
                  <SelectItem key={face.name} value={face.name}>
                    {face.name} ({face.images.length} samples)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="new-face-name">New Face Name</Label>
            <Input
              id="new-face-name"
              placeholder="Enter person's name..."
              value={newFaceName}
              onChange={(e) => setNewFaceName(e.target.value)}
              className="mt-2"
            />
          </div>
        )}

        <Button
          onClick={handleLabelFaces}
          disabled={
            selectedFacesCount === 0 ||
            isLabeling ||
            (labelMode === 'existing' && !selectedKnownFace) ||
            (labelMode === 'new' && !newFaceName.trim())
          }
          className="w-full"
        >
          {isLabeling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Labeling...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Label {selectedFacesCount} Face(s)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
