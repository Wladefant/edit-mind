import { motion } from 'framer-motion'
import { CircularProgress } from './CircularProgress'
import { stageConfig } from '~/constants/job'
import type { Job } from '@prisma/client'

export function LargeJobCard({ job }: { job: Job }) {
  const stage = stageConfig[job.stage]

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="relative bg-linear-to-br from-gray-900 via-gray-900 to-black rounded-4xl overflow-hidden border border-white/10 h-full"
    >
      <div className={`absolute inset-0 bg-linear-to-br ${stage.gradient} opacity-20`} />

      <div className="relative z-10 p-8 h-full flex flex-col">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{job.videoPath.split('/').pop()}</h2>
            <p className="text-white/60 text-lg">{stage.label}</p>
          </div>

          {job.status === 'done' && (
            <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center">
          {job.status === 'processing' ? (
            <CircularProgress progress={job.progress} stage={job.stage} />
          ) : (
            <div className="w-full max-w-md aspect-video rounded-2xl overflow-hidden">
              {job.thumbnailPath ? (
                <img src={'/thumbnails/' + job.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Status</p>
            <p className="text-white font-semibold capitalize">{job.status}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-sm uppercase tracking-wider mb-1">Overall Progress</p>
            <p className="text-white font-semibold tabular-nums">{job.overallProgress}%</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
