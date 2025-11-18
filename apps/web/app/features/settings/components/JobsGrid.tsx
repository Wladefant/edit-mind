import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LargeJobCard } from './LargeJobCard'
import { SmallJobCard } from './SmallJobCard'
import type { Job } from '@prisma/client'

export function JobsGrid({ jobs }: { jobs: Job[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const featuredJob = jobs.find((j) => j.status === 'processing') || jobs[0]
  const otherJobs = jobs.filter((j) => j.id !== featuredJob?.id)

  if (!featuredJob) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={mounted ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="w-full md:py-8"
    >
      <div className="grid grid-cols-12 gap-4 max-w-full">
        <div className="col-span-12 lg:col-span-8 row-span-2 min-h-[500px]">
          <LargeJobCard job={featuredJob} />
        </div>

        {otherJobs.slice(0, 2).map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="col-span-12 lg:col-span-4 min-h-60"
          >
            <SmallJobCard job={job} />
          </motion.div>
        ))}

        {otherJobs.slice(2, otherJobs.length).map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 2) * 0.1, duration: 0.5 }}
            className="col-span-12 md:col-span-6 lg:col-span-4 min-h-60"
          >
            <SmallJobCard job={job} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
