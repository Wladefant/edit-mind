import type { JobStage } from '@prisma/client';
import { motion } from 'framer-motion'
import { stageConfig } from '~/features/settings/constants/job'

export function CircularProgress({ progress, stage }: { progress: number; stage: JobStage }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative w-44 h-44">
      <svg className="transform -rotate-90 w-44 h-44">
        <circle
          cx="88"
          cy="88"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-white/10"
        />
        <motion.circle
          cx="88"
          cy="88"
          r={radius}
          stroke={stageConfig[stage]?.ringColor || '#667eea'}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-white tabular-nums">{progress}</span>
        <span className="text-sm text-white/60 mt-1">percent</span>
      </div>
    </div>
  )
}
