import { Maximize } from 'lucide-react'

interface FullscreenButtonProps {
  onToggleFullscreen: () => void
}

export function FullscreenButton({ onToggleFullscreen }: FullscreenButtonProps) {
  return (
    <button
      onClick={onToggleFullscreen}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      aria-label="Toggle fullscreen"
    >
      <Maximize size={20} className="text-white" strokeWidth={2} />
    </button>
  )
}
