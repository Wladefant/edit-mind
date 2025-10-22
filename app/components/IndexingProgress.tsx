import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Circle, Loader, Clock, Film } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'

export type IndexingProgressProps = {
  video: string
  step: 'transcription' | 'frame-analysis' | 'embedding'
  progress: number
  success: boolean
  stepIndex: number
  thumbnailUrl?: string
  elapsed?: string
  framesProcessed?: number
  totalFrames?: number
}

const steps = [
  { id: 'transcription', name: 'Transcription' },
  { id: 'frame-analysis', name: 'Frame Analysis' },
  { id: 'embedding', name: 'Embedding' },
]

export const IndexingProgress = ({
  video,
  step,
  progress,
  thumbnailUrl,
  elapsed,
  framesProcessed,
  totalFrames,
}: IndexingProgressProps) => {
  const currentStepIndex = steps.findIndex((s) => s.id === step)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="indexing-progress"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Indexing in Progress</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{video}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {thumbnailUrl && (
              <div className="relative mb-4 flex items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={thumbnailUrl}
                  alt={video}
                  className="h-[300px] w-auto rounded-lg object-cover object-center"
                />
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-lg bg-black/50"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/70 px-4 py-2 backdrop-blur-sm">
                    <span className="text-2xl font-bold text-white">{progress}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">{steps[currentStepIndex].name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {elapsed && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock size={14} />
                      <span>{elapsed}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
                </div>
              </div>

              <Progress value={progress} className="h-2" />

              {framesProcessed !== undefined && totalFrames !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center space-x-2">
                    <Film size={16} className="text-green-500" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Frames</span>
                      <span className="text-sm font-semibold">
                        {framesProcessed}/{totalFrames}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-between pt-2">
                {steps.map((s, index) => {
                  const isCompleted = index < currentStepIndex || progress === 100
                  const isCurrent = index === currentStepIndex

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-2"
                    >
                      {isCompleted ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : isCurrent ? (
                        <Loader size={20} className="animate-spin text-blue-500" />
                      ) : (
                        <Circle size={20} className="text-gray-400" />
                      )}
                      <span
                        className={`text-sm ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                      >
                        {s.name}
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              {framesProcessed !== undefined &&
                totalFrames !== undefined &&
                totalFrames > 0 &&
                step === 'frame-analysis' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Frame Progress</span>
                      <span>
                        {framesProcessed} / {totalFrames} frames
                      </span>
                    </div>
                    <Progress value={(framesProcessed / totalFrames) * 100} className="h-1.5" />
                  </motion.div>
                )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
