import { useMemo } from 'react';
import { Video } from '@/lib/types/video';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getSceneCount = (video: Video) => video.scenes?.length || 0;

const getUniqueFaces = (video: Video) => {
  const faces = new Set<string>();
  video.scenes?.forEach((scene) => {
    scene.faces?.forEach((face) => faces.add(face));
  });
  return Array.from(faces);
};

const getUniqueLocations = (video: Video) => {
  const locations = new Set<string>();
  video.scenes?.forEach((scene) => {
    if (scene.location) locations.add(scene.location);
  });
  return Array.from(locations);
};

const getDominantColor = (video: Video) => {
  const colorMap = new Map<string, { name: string; hex: string; count: number }>();

  video.scenes?.forEach((scene) => {
    if (scene.dominantColorName && scene.dominantColorHex) {
      const key = scene.dominantColorHex;
      if (colorMap.has(key)) {
        colorMap.get(key)!.count++;
      } else {
        colorMap.set(key, {
          name: scene.dominantColorName,
          hex: scene.dominantColorHex,
          count: 1,
        });
      }
    }
  });

  if (colorMap.size === 0) return null;

  return Array.from(colorMap.values()).sort((a, b) => b.count - a.count)[0];
};

export const useVideoCard = (video: Video) => {
  const duration = useMemo(() => formatDuration(parseInt(video.duration?.toString() || '0')), [video.duration]);
  const sceneCount = useMemo(() => getSceneCount(video), [video.scenes]);
  const uniqueFaces = useMemo(() => getUniqueFaces(video), [video.scenes]);
  const uniqueLocations = useMemo(() => getUniqueLocations(video), [video.scenes]);
  const dominantColor = useMemo(() => getDominantColor(video), [video.scenes]);

  const videoTitle = useMemo(() => {
    return (
      video.source
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || video.source
    );
  }, [video.source]);

  return {
    duration,
    sceneCount,
    uniqueFaces,
    uniqueLocations,
    dominantColor,
    videoTitle,
  };
};
