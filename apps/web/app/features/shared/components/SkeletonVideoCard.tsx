export function SkeletonVideoCard({
  aspectRatio = '16:9',
}: { aspectRatio?: '16:9' | '9:16' }) {
  const minHeight = aspectRatio === '16:9' ? 'min-h-[250px]' : 'min-h-[350px]'

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden bg-white/10 dark:bg-white/5 
        backdrop-blur-sm animate-pulse ${minHeight}
      `}
    >
      <div
        className={`
          w-full h-full object-cover rounded-2xl bg-gray-300 dark:bg-gray-700
          ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
        `}
      />

      <div className="absolute top-3 left-3 flex gap-1.5 z-10">
        <div className="w-8 h-5 bg-blue-400/40 rounded-full" />
        <div className="w-8 h-5 bg-green-400/40 rounded-full" />
      </div>

      <div className="absolute top-3 right-3 w-7 h-7 bg-white/30 dark:bg-gray-700/50 rounded-full" />

      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
        <div className="flex flex-col flex-1 min-w-0 mr-2">
          <div className="h-4 w-3/4 bg-gray-400/60 dark:bg-gray-600/60 rounded" />
          <div className="h-3 w-1/2 bg-gray-400/60 dark:bg-gray-600/60 rounded mt-1" />
        </div>

        <div className="h-6 w-14 bg-gray-400/60 dark:bg-gray-600/60 rounded-md" />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 overflow-hidden rounded-b-2xl">
        <div className="h-full w-1/3 bg-white/30" />
      </div>
    </div>
  )
}
