
import { useMemo } from 'react';
import { Video } from '@/lib/types/video';

export const useVideoMetadata = (videos: Video[]) => {
  const videoMetadata = useMemo(() => {
    const metadata = {
      faces: new Map<string, number>(),
      objects: new Map<string, number>(),
      emotions: new Map<string, number>(),
      shotTypes: new Map<string, number>(),
      aspectRatios: new Map<string, number>(),
      cameras: new Map<string, number>(),
      descriptions: [] as string[],
      totalScenes: 0,
      colors: new Map<string, number>(),
    };

    videos.forEach((video) => {
      if (video.scenes && video.scenes.length > 0) {
        metadata.totalScenes += video.scenes.length;

        video.scenes.forEach((scene) => {
          if (scene.faces) {
            scene.faces.forEach((face) => {
              if (!face.toLocaleLowerCase().includes('unknown')) {
                metadata.faces.set(face, (metadata.faces.get(face) || 0) + 1);
              }
            });
          }

          if (scene.objects) {
            scene.objects.forEach((obj) => {
              if (obj) {
                metadata.objects.set(obj, (metadata.objects.get(obj) || 0) + 1);
              }
            });
          }

          if (scene.emotions) {
            scene.emotions.forEach((emotion) => {
              if (emotion) {
                metadata.emotions.set(emotion.emotion, (metadata.emotions.get(emotion.emotion) || 0) + 1);
              }
            });
          }

          if (scene.shot_type && scene.shot_type !== 'N/A') {
            metadata.shotTypes.set(scene.shot_type, (metadata.shotTypes.get(scene.shot_type) || 0) + 1);
          }
          if (scene.dominantColorName && scene.dominantColorName !== 'N/A') {
            metadata.colors.set(scene.dominantColorName, (metadata.shotTypes.get(scene.dominantColorName) || 0) + 1);
          }

          if (scene.description) {
            metadata.descriptions.push(scene.description);
          }
        });
      }

      if (video.aspect_ratio) {
        metadata.aspectRatios.set(video.aspect_ratio, (metadata.aspectRatios.get(video.aspect_ratio) || 0) + 1);
      }

      if (video.camera) {
        metadata.cameras.set(video.camera, (metadata.cameras.get(video.camera) || 0) + 1);
      }
    });

    return metadata;
  }, [videos]);

  return videoMetadata;
};
