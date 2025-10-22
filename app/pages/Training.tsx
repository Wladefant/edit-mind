import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import { Loader2, UserPlus } from 'lucide-react';
import { useTraining } from '@/app/hooks/useTraining';
import { UnknownFacesGrid } from '@/app/components/training/UnknownFacesGrid';
import { KnownFacesGrid } from '@/app/components/training/KnownFacesGrid';
import { LabelingForm } from '@/app/components/training/LabelingForm';

export const Training: React.FC = () => {
  const {
    unknownFaces,
    knownFaces,
    loading,
    selectedFaces,
    labelMode,
    selectedKnownFace,
    newFaceName,
    isLabeling,
    activeTab,
    setLabelMode,
    setSelectedKnownFace,
    setNewFaceName,
    setActiveTab,
    handleSelectFace,
    handleSelectAll,
    handleLabelFaces,
    handleDeleteUnknownFace,
  } = useTraining();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading faces...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Face Training</h1>
        <p className="text-muted-foreground">
          Label unknown faces to improve face recognition accuracy across your video library.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="unknown">
            Unknown Faces
            <Badge variant="secondary" className="ml-2">
              {unknownFaces.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="known">
            Known Faces
            <Badge variant="secondary" className="ml-2">
              {knownFaces.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unknown">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Unknown Faces</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {unknownFaces.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No unknown faces found. All faces have been labeled!</p>
                </div>
              ) : (
                <>
                  <LabelingForm
                    selectedFacesCount={selectedFaces.size}
                    handleSelectAll={handleSelectAll}
                    labelMode={labelMode}
                    setLabelMode={setLabelMode}
                    selectedKnownFace={selectedKnownFace}
                    setSelectedKnownFace={setSelectedKnownFace}
                    knownFaces={knownFaces}
                    newFaceName={newFaceName}
                    setNewFaceName={setNewFaceName}
                    handleLabelFaces={handleLabelFaces}
                    isLabeling={isLabeling}
                    unknownFacesCount={unknownFaces.length}
                  />
                  <UnknownFacesGrid
                    unknownFaces={unknownFaces}
                    selectedFaces={selectedFaces}
                    handleSelectFace={handleSelectFace}
                    handleDeleteUnknownFace={handleDeleteUnknownFace}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="known">
          <Card>
            <CardHeader>
              <CardTitle>Known Faces</CardTitle>
            </CardHeader>
            <CardContent>
              {knownFaces.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No known faces yet. Start labeling unknown faces!</p>
                </div>
              ) : (
                <KnownFacesGrid knownFaces={knownFaces} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};