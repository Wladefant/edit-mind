import { useState, useEffect, useMemo } from 'react';
import { Video } from '@/lib/types/video';

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const allVideos = await window.conveyor.app.getAllVideos();
        const coordsToFetch = new Map<string, { location: string }>();

        allVideos.forEach((video) => {
          video.scenes?.forEach((scene) => {
            if (scene.location) {
              const key = scene.location;
              coordsToFetch.set(key, { location: scene.location });
            }
          });
        });

        const locationMap = new Map<string, string>();
        for (const [coordStr, coords] of coordsToFetch.entries()) {
          const name = await window.conveyor.app.getLocationName(coords.location);
          locationMap.set(coordStr, name);
        }

        const processed = allVideos.map((video) => ({
          ...video,
          scenes: video.scenes?.map((scene) => ({
            ...scene,
            location: scene.location ? locationMap.get(scene.location) || scene.location : undefined,
          })),
        }));
        setVideos(processed);
        setFilteredVideos(processed);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filterableData = useMemo(() => {
    const cameras = new Set<string>();
    const colors = new Set<string>();
    const locations = new Set<string>();
    const faces = new Set<string>();
    const objects = new Set<string>();
    const shotTypes = new Set<string>();

    videos.forEach((video) => {
      if (video.camera) cameras.add(video.camera);
      video.scenes?.forEach((scene) => {
        if (scene.dominantColorName) colors.add(scene.dominantColorName);
        if (scene.location) locations.add(scene.location);
        scene.faces?.forEach((face) => !face.toLocaleLowerCase()?.includes('unknown') && faces.add(face.toLocaleLowerCase()));
        scene.objects?.forEach((object) => objects.add(object));
        if (scene.shot_type) shotTypes.add(scene.shot_type);
      });
    });

    return {
      cameras: Array.from(cameras).sort(),
      colors: Array.from(colors).sort(),
      locations: Array.from(locations).sort(),
      faces: Array.from(faces).sort(),
      objects: Array.from(objects).sort(),
      shotTypes: Array.from(shotTypes).sort(),
    };
  }, [videos]);

  useEffect(() => {
    const applyFilters = () => {
      let newFilteredVideos = [...videos];

      // Apply search filter
      if (searchQuery.trim()) {
        newFilteredVideos = newFilteredVideos.filter((video) =>
          video.source.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply category filters
      for (const key in filters) {
        if (filters[key].length > 0) {
          newFilteredVideos = newFilteredVideos.filter((video) => {
            if (key === 'cameras') {
              return filters[key].includes(video.camera);
            }
            return video.scenes?.some((scene) => {
              if (key === 'colors') {
                return filters[key].includes(scene.dominantColorName);
              }
              if (key === 'locations') {
                return filters[key].includes(scene.location);
              }
              if (key === 'faces') {
                return scene.faces?.some((face) => filters[key].includes(face));
              }
              if (key === 'objects') {
                return scene.objects?.some((object) => filters[key].includes(object));
              }
              if (key === 'shotTypes') {
                return filters[key].includes(scene.shot_type);
              }
              return false;
            });
          });
        }
      }
      setFilteredVideos(newFilteredVideos);
    };

    applyFilters();
  }, [filters, videos, searchQuery]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  return {
    videos,
    filteredVideos,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    isLoading,
    filterableData,
    activeFiltersCount,
    clearAllFilters,
  };
};
