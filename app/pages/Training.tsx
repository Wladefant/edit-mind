import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Badge } from '@/app/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Loader2, UserPlus, RefreshCw, Check, X } from 'lucide-react'

interface UnknownFace {
  image_file: string
  json_file: string
  image_hash: string
  created_at: string
  video_path: string
  video_name: string
  frame_index: number
  timestamp_ms: number
  timestamp_seconds: number
  formatted_timestamp: string
  frame_dimensions: {
    width: number
    height: number
  }
  face_id: string
  bounding_box: {
    top: number
    right: number
    bottom: number
    left: number
    width: number
    height: number
  }
  padded_bounding_box: {
    top: number
    right: number
    bottom: number
    left: number
    width: number
    height: number
  }
  face_center: {
    x: number
    y: number
  }
  face_encoding: number[]
  frame_duration_ms: number
  frame_start_time_ms: number
  frame_end_time_ms: number
  context: {
    detected_objects: string[]
    scene_type: string
    environment: string
    other_faces_in_frame: string[]
  }
  label: {
    name: string | null
    labeled_by: string | null
    labeled_at: string | null
    confidence: number | null
    notes: string | null
  }
  quality: {
    face_size_pixels: number
    face_coverage_percent: number
    aspect_ratio: number
  }
}

interface KnownFace {
  name: string
  images: string[]
}

export const TrainingPage: React.FC = () => {
  const [unknownFaces, setUnknownFaces] = useState<UnknownFace[]>([])
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set())
  const [labelMode, setLabelMode] = useState<'existing' | 'new'>('existing')
  const [selectedKnownFace, setSelectedKnownFace] = useState<string>('')
  const [newFaceName, setNewFaceName] = useState<string>('')
  const [isLabeling, setIsLabeling] = useState<boolean>(false)
  const [isReindexing, setIsReindexing] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('unknown')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch unknown faces
      const unknownFacesData = await window.conveyor.app.getUnknownFaces()
      setUnknownFaces(unknownFacesData)

      const knownFacesData = await window.conveyor.app.getKnownFaces()
      const knownFacesArray = Object.entries(knownFacesData).map(([name, images]) => ({
        name,
        images,
      }))
      setKnownFaces(knownFacesArray)
    } catch (error) {
      console.error('Error fetching face data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFace = (image_hash: string) => {
    setSelectedFaces((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(image_hash)) {
        newSelection.delete(image_hash)
      } else {
        newSelection.add(image_hash)
      }
      return newSelection
    })
  }

  const handleSelectAll = () => {
    if (selectedFaces.size === unknownFaces.length) {
      setSelectedFaces(new Set())
    } else {
      setSelectedFaces(new Set(unknownFaces.map((face) => face.image_hash)))
    }
  }

  const handleLabelFaces = async () => {
    if (selectedFaces.size === 0) {
      alert('Please select at least one face to label.')
      return
    }

    const targetName = labelMode === 'existing' ? selectedKnownFace : newFaceName.trim()

    if (!targetName) {
      alert('Please select an existing face or enter a new name.')
      return
    }

    setIsLabeling(true)
    try {
      for (const image_hash of selectedFaces) {
        const face = unknownFaces.find((f) => f.image_hash === image_hash)
        if (face) {
          await window.conveyor.app.labelUnknownFace(face.json_file, targetName)
          await window.conveyor.app.reindexAllFaces(face.json_file, face.face_id, targetName)
        }
      }

      alert(`Successfully labeled ${selectedFaces.size} face(s) as "${targetName}"`)

      // Reset state
      setSelectedFaces(new Set())
      setNewFaceName('')
      setSelectedKnownFace('')

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error('Error labeling faces:', error)
      alert('Error labeling faces. Please try again.')
    } finally {
      setIsLabeling(false)
    }
  }

  const handleReindexFaces = async () => {
    const confirmed = confirm('This will reindex all faces in your video library. This may take a while. Continue?')

    if (!confirmed) return

    setIsReindexing(true)
    try {
      // Placeholder for reindexing logic
      // await window.conveyor.app.reindexAllFaces();
      alert('Face reindexing started successfully!')

      // Refresh data after reindexing
      await fetchData()
    } catch (error) {
      console.error('Error reindexing faces:', error)
      alert('Error starting face reindexing. Please try again.')
    } finally {
      setIsReindexing(false)
    }
  }

  const handleDeleteUnknownFace = async (face: UnknownFace) => {
    try {
      await window.conveyor.app.deleteUnknownFace(face.image_file, face.json_file)
      setUnknownFaces((prev) => prev.filter((f) => f.face_id !== face.face_id))
      setSelectedFaces((prev) => {
        const newSelection = new Set(prev)
        newSelection.delete(face.image_hash)
        return newSelection
      })
    } catch (error) {
      console.error('Error deleting face:', error)
      alert('Error deleting face.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading faces...</span>
      </div>
    )
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
                <Button onClick={handleReindexFaces} disabled={isReindexing} variant="outline">
                  {isReindexing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reindexing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reindex All Faces
                    </>
                  )}
                </Button>
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
                  {/* Labeling Controls */}
                  <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold">Label Selected Faces ({selectedFaces.size})</Label>
                      <Button onClick={handleSelectAll} variant="outline" size="sm">
                        {selectedFaces.size === unknownFaces.length ? 'Deselect All' : 'Select All'}
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
                          selectedFaces.size === 0 ||
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
                            Label {selectedFaces.size} Face(s)
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Unknown Faces Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                            e.stopPropagation()
                            handleDeleteUnknownFace(face)
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
