export const OVERLAY_COLORS = {
  face: 'border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.5)]',
  object: 'border-green-500 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  text: 'border-purple-500 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.5)]',
} as const

export const OVERLAY_MODE_COLORS = {
  all: 'bg-white text-black',
  faces: 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]',
  objects: 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]',
  text: 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]',
  none: 'bg-gray-500 text-white',
} as const

export const BADGE_COLORS = {
  face: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
  object: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
  },
  text: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
  },
} as const
