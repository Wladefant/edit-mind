import { useState, useEffect, useCallback } from 'react'
import type { UnknownFace, KnownFace } from '@shared/types/face'

interface MatchingStatus {
  isMatching: boolean
  progress: number
  matchesFound: number
  currentPerson: string
  error: string | null
}

export const useTraining = () => {
  const [unknownFaces, setUnknownFaces] = useState<UnknownFace[]>([])
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set())
  const [labelMode, setLabelMode] = useState<'existing' | 'new'>('existing')
  const [selectedKnownFace, setSelectedKnownFace] = useState<string>('')
  const [newFaceName, setNewFaceName] = useState<string>('')
  const [isLabeling, setIsLabeling] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('unknown')
  const [matchingStatus, setMatchingStatus] = useState<MatchingStatus>({
    isMatching: false,
    progress: 0,
    matchesFound: 0,
    currentPerson: '',
    error: null,
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch unknown faces
      const unknownResponse = await fetch('/api/faces/unknown')
      if (!unknownResponse.ok) throw new Error('Failed to fetch unknown faces')
      const unknownFacesData = await unknownResponse.json()
      setUnknownFaces(unknownFacesData)

      // Fetch known faces
      const knownResponse = await fetch('/api/faces/known')
      if (!knownResponse.ok) throw new Error('Failed to fetch known faces')
      const knownFacesData = await knownResponse.json()
      const knownFacesArray = Object.entries(knownFacesData).map(([name, images]) => ({
        name,
        images: images as string[],
      }))
      setKnownFaces(knownFacesArray)
    } catch (error) {
      console.error('Error fetching face data:', error)
      setMatchingStatus((prev) => ({
        ...prev,
        error: 'Failed to load face data. Please refresh the page.',
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectFace = useCallback((image_hash: string) => {
    setSelectedFaces((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(image_hash)) {
        newSelection.delete(image_hash)
      } else {
        newSelection.add(image_hash)
      }
      return newSelection
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedFaces.size === unknownFaces.length) {
      setSelectedFaces(new Set())
    } else {
      setSelectedFaces(new Set(unknownFaces.map((face) => face.image_hash)))
    }
  }, [selectedFaces.size, unknownFaces])

  const dismissSuccess = useCallback(() => {
    setSuccessMessage(null)
  }, [])

  const dismissError = useCallback(() => {
    setMatchingStatus((prev) => ({ ...prev, error: null }))
  }, [])

  const handleLabelFaces = useCallback(async () => {
    if (selectedFaces.size === 0) {
      setMatchingStatus((prev) => ({
        ...prev,
        error: 'Please select at least one face to label.',
      }))
      return
    }

    const targetName = labelMode === 'existing' ? selectedKnownFace : newFaceName.trim()

    if (!targetName) {
      setMatchingStatus((prev) => ({
        ...prev,
        error: 'Please select an existing face or enter a new name.',
      }))
      return
    }

    setIsLabeling(true)
    setMatchingStatus({
      isMatching: true,
      progress: 0,
      matchesFound: 0,
      currentPerson: targetName,
      error: null,
    })
    setSuccessMessage(null)

    let labeledCount = 0
    let failedCount = 0

    try {
      const selectedFacesArray = Array.from(selectedFaces)
      
      for (let i = 0; i < selectedFacesArray.length; i++) {
        const image_hash = selectedFacesArray[i]
        const face = unknownFaces.find((f) => f.image_hash === image_hash)
        
        if (face) {
          try {
            const response = await fetch('/api/faces/label', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                jsonFile: face.json_file,
                faceId: face.face_id,
                name: targetName,
              }),
            })

            const result = await response.json()
            
            if (!response.ok || !result.success) {
              throw new Error(`Failed to label face ${face.face_id}`)
            }

            labeledCount++

            setMatchingStatus((prev) => ({
              ...prev,
              progress: 0,
            }))

          } catch (error) {
            console.error(`Error labeling face ${face.face_id}:`, error)
            failedCount++
          }
        }
      }

      if (labeledCount > 0) {
        setSuccessMessage(
          `Successfully labeled ${labeledCount} face(s) as "${targetName}". 
          Automatic matching is now running in the background to find similar faces.`
        )
      }

      if (failedCount > 0) {
        setMatchingStatus((prev) => ({
          ...prev,
          error: `${failedCount} face(s) failed to label. Please try again.`,
        }))
      }

      setSelectedFaces(new Set())
      setNewFaceName('')
      setSelectedKnownFace('')

      await fetchData()

      pollMatchingStatus(targetName)

    } catch (error) {
      console.error('Error labeling faces:', error)
      setMatchingStatus((prev) => ({
        ...prev,
        error: 'An unexpected error occurred while labeling faces. Please try again.',
      }))
    } finally {
      setIsLabeling(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFaces, labelMode, selectedKnownFace, newFaceName, unknownFaces, fetchData])

  const pollMatchingStatus = useCallback(async (personName: string) => {
    const pollInterval = 2000 
    const maxPolls = 60 

    let pollCount = 0

    const poll = async () => {
      if (pollCount >= maxPolls) {
        setMatchingStatus((prev) => ({
          ...prev,
          isMatching: false,
        }))
        return
      }

      try {
        const response = await fetch(`/api/faces/matching-status?person=${encodeURIComponent(personName)}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch matching status')
        }

        const status = await response.json()

        setMatchingStatus((prev) => ({
          ...prev,
          progress: status.progress || prev.progress,
          matchesFound: status.matchesFound || 0,
          isMatching: status.isActive,
        }))

        if (status.isActive) {
          pollCount++
          setTimeout(poll, pollInterval)
        } else {
          if (status.matchesFound > 0) {
            setSuccessMessage(
              `Automatic matching complete! Found and labeled ${status.matchesFound} additional matching face(s).`
            )
            await fetchData()
          }
          setMatchingStatus((prev) => ({
            ...prev,
            isMatching: false,
          }))
        }

      } catch (error) {
        console.error('Error polling matching status:', error)
        setMatchingStatus((prev) => ({
          ...prev,
          isMatching: false,
          error: 'Failed to get automatic matching status.',
        }))
      }
    }

    poll()
  }, [fetchData])

  const handleDeleteUnknownFace = useCallback(async (face: UnknownFace) => {
    try {
      const response = await fetch('/api/faces/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageFile: face.image_file,
          jsonFile: face.json_file,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error('Failed to delete face')
      }

      setUnknownFaces((prev) => prev.filter((f) => f.face_id !== face.face_id))
      setSelectedFaces((prev) => {
        const newSelection = new Set(prev)
        newSelection.delete(face.image_hash)
        return newSelection
      })

      setSuccessMessage('Face deleted successfully.')

    } catch (error) {
      console.error('Error deleting face:', error)
      setMatchingStatus((prev) => ({
        ...prev,
        error: 'Failed to delete face. Please try again.',
      }))
    }
  }, [])

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
    matchingStatus,
    successMessage,
    setLabelMode,
    setSelectedKnownFace,
    setNewFaceName,
    setActiveTab,
    handleSelectFace,
    handleSelectAll,
    handleLabelFaces,
    handleDeleteUnknownFace,
    dismissSuccess,
    dismissError,
  }
}