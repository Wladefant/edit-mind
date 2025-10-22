import { useState, useEffect, useCallback } from 'react';
import { UnknownFace, KnownFace } from '@/lib/types/face';

export const useTraining = () => {
  const [unknownFaces, setUnknownFaces] = useState<UnknownFace[]>([]);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set());
  const [labelMode, setLabelMode] = useState<'existing' | 'new'>('existing');
  const [selectedKnownFace, setSelectedKnownFace] = useState<string>('');
  const [newFaceName, setNewFaceName] = useState<string>('');
  const [isLabeling, setIsLabeling] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('unknown');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const unknownFacesData = await window.conveyor.app.getUnknownFaces();
      setUnknownFaces(unknownFacesData);

      const knownFacesData = await window.conveyor.app.getKnownFaces();
      const knownFacesArray = Object.entries(knownFacesData).map(([name, images]) => ({
        name,
        images,
      }));
      setKnownFaces(knownFacesArray);
    } catch (error) {
      console.error('Error fetching face data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectFace = useCallback((image_hash: string) => {
    setSelectedFaces((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(image_hash)) {
        newSelection.delete(image_hash);
      } else {
        newSelection.add(image_hash);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFaces.size === unknownFaces.length) {
      setSelectedFaces(new Set());
    } else {
      setSelectedFaces(new Set(unknownFaces.map((face) => face.image_hash)));
    }
  }, [selectedFaces.size, unknownFaces.length]);

  const handleLabelFaces = useCallback(async () => {
    if (selectedFaces.size === 0) {
      alert('Please select at least one face to label.');
      return;
    }

    const targetName = labelMode === 'existing' ? selectedKnownFace : newFaceName.trim();

    if (!targetName) {
      alert('Please select an existing face or enter a new name.');
      return;
    }

    setIsLabeling(true);
    try {
      for (const image_hash of selectedFaces) {
        const face = unknownFaces.find((f) => f.image_hash === image_hash);
        if (face) {
          await window.conveyor.app.labelUnknownFace(face.json_file, targetName);
          await window.conveyor.app.reindexAllFaces(face.json_file, face.face_id, targetName);
        }
      }

      alert(`Successfully labeled ${selectedFaces.size} face(s) as "${targetName}"`);

      setSelectedFaces(new Set());
      setNewFaceName('');
      setSelectedKnownFace('');

      await fetchData();
    } catch (error) {
      console.error('Error labeling faces:', error);
      alert('Error labeling faces. Please try again.');
    } finally {
      setIsLabeling(false);
    }
  }, [selectedFaces, labelMode, selectedKnownFace, newFaceName, unknownFaces, fetchData]);

  const handleDeleteUnknownFace = useCallback(
    async (face: UnknownFace) => {
      try {
        await window.conveyor.app.deleteUnknownFace(face.image_file, face.json_file);
        setUnknownFaces((prev) => prev.filter((f) => f.face_id !== face.face_id));
        setSelectedFaces((prev) => {
          const newSelection = new Set(prev);
          newSelection.delete(face.image_hash);
          return newSelection;
        });
      } catch (error) {
        console.error('Error deleting face:', error);
        alert('Error deleting face.');
      }
    },
    []
  );

  return {
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
  };
};
