import { FaceData } from "@/lib/types/search"
import { useMemo } from "react"

export const useFilteredFaces = (faces: FaceData[], query: string): FaceData[] => {
  return useMemo(() => {
    if (!query) return faces

    const lowercaseQuery = query.toLowerCase()
    return faces.filter((face) => face.name.toLowerCase().includes(lowercaseQuery))
  }, [faces, query])
}

