import type { Job } from '@prisma/client'
import { motion } from 'framer-motion'
import { stageConfig } from '~/constants/job'

export function SmallJobCard({ job }: { job: Job }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative bg-linear-to-br from-gray-900 to-black rounded-3xl p-3 overflow-hidden border border-white/10 h-full"
    >
      <div className="relative z-10">
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-800 mb-4">
          {job.thumbnailPath ? (
            <img src={'/thumbnails/' + job.thumbnailPath} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
        <h3 className="text-white font-semibold text-base mb-1 truncate">{job.videoPath.split('/').pop()}</h3>
        <p className="text-white/50 text-sm">{stageConfig[job.stage]?.label}</p>

        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${job.overallProgress}%` }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>
    </motion.div>
  )
}
