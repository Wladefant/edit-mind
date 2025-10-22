import { useMemo } from 'react';
import { Video, VideoMetadataMap } from '@/lib/types/video';

const processScene = (scene, metadata) => {
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
    metadata.colors.set(scene.dominantColorName, (metadata.colors.get(scene.dominantColorName) || 0) + 1);
  }

  if (scene.description) {
    metadata.descriptions.push(scene.description);
  }
};

const processVideo = (video, metadata) => {
  if (video.scenes && video.scenes.length > 0) {
    metadata.totalScenes += video.scenes.length;
    video.scenes.forEach((scene) => processScene(scene, metadata));
  }

  if (video.aspect_ratio) {
    metadata.aspectRatios.set(video.aspect_ratio, (metadata.aspectRatios.get(video.aspect_ratio) || 0) + 1);
  }

  if (video.camera) {
    metadata.cameras.set(video.camera, (metadata.cameras.get(video.camera) || 0) + 1);
  }
};

export const useVideoMetadata = (videos: Video[]): VideoMetadataMap => {
  return useMemo(() => {
    const metadata: VideoMetadataMap = {
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

    videos.forEach((video) => processVideo(video, metadata));

    return metadata;
  }, [videos]);
};