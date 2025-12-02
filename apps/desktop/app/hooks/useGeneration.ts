import { useState, useCallback } from 'react';
import { GenerationResult, VideoConfig } from '@/lib/types/search';
import { ExportedScene, Scene } from '@/lib/types/scene';

const stitchVideos = async (scenes: ExportedScene[], videoConfig: VideoConfig): Promise<GenerationResult> => {
  const outputFilename = `rough_cut_${Date.now()}`;
  const videoFilename = `${outputFilename}.mp4`;
  const fcpxmlFilename = `${outputFilename}.fcpxml`;

  await window.conveyor.app.stitchVideos(
    scenes,
    videoFilename,
    videoConfig.aspectRatio,
    videoConfig.fps
  );

  return {
    message: `Rough cut "${videoFilename}"`,
    videoPath: videoFilename,
    fcpxmlPath: fcpxmlFilename,
  };
};

export const useGeneration = (selectedScenes: Set<number>, searchResults: Scene[], videoConfig: VideoConfig) => {
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerateRoughCut = useCallback(async () => {
    if (selectedScenes.size === 0) {
      setGenerationStatus('Please select at least one scene to generate a rough cut.');
      return;
    }

    setLoading(true);
    setGenerationStatus('Generating rough cut...');
    setGenerationResult(null);

    try {
      const scenesToStitch: ExportedScene[] = Array.from(selectedScenes)
        .map((index) => {
          const scene = searchResults[index];
          return {
            source: scene.source,
            startTime: scene.startTime,
            endTime: scene.endTime,
          };
        })
        .sort((a, b) => {
          if (a.source < b.source) return -1;
          if (a.source > b.source) return 1;
          return a.startTime - b.startTime;
        });

      const result = await stitchVideos(scenesToStitch, videoConfig);

      setGenerationStatus(result.message);
      setGenerationResult(result);
    } catch (error) {
      console.error('Error generating rough cut:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGenerationStatus(`Error generating rough cut: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [selectedScenes, searchResults, videoConfig]);

  const handleOpenVideo = useCallback(async () => {
    if (!generationResult?.videoPath) return;

    try {
      await window.conveyor.app.openFile(generationResult.videoPath);
    } catch (error) {
      console.error('Error opening video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGenerationStatus(`Error opening video file: ${errorMessage}`);
    }
  }, [generationResult]);

  const handleShowInFinder = useCallback(async () => {
    if (!generationResult?.videoPath) return;

    try {
      await window.conveyor.app.showInFolder(generationResult.videoPath);
    } catch (error) {
      console.error('Error showing in finder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGenerationStatus(`Error showing file in folder: ${errorMessage}`);
    }
  }, [generationResult]);

  return {
    generationStatus,
    generationResult,
    loading,
    handleGenerateRoughCut,
    handleOpenVideo,
    handleShowInFinder,
    setGenerationStatus,
    setGenerationResult,
  };
};