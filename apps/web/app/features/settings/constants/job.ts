import type { JobStage } from '@prisma/client'

export const stageConfig: Record<
  JobStage,
  {
    gradient: string
    label: string
    ringColor: string
    description: string
  }
> = {
  starting: {
    gradient: 'from-sky-500 via-indigo-500 to-purple-500',
    label: 'Initializing Job',
    ringColor: '#3b82f6', // sky-500
    description: 'Preparing environment and resources...',
  },
  transcribing: {
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    label: 'Transcribing Audio',
    ringColor: '#6366f1', // indigo-500
    description: 'Extracting speech and converting to text...',
  },
  frame_analysis: {
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    label: 'Analyzing Frames',
    ringColor: '#f59e0b', // amber-500
    description: 'Detecting key frames and visual segments...',
  },
  embedding: {
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    label: 'Creating Embeddings',
    ringColor: '#06b6d4', // cyan-500
    description: 'Building semantic embeddings for AI understanding...',
  },
  creating_scenes: {
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    label: 'Generating Scenes',
    ringColor: '#ec4899', // pink-500
    description: 'Generating final scenes and summaries...',
  },
}
