import { RefObject, useEffect } from 'react'

export const useClickOutside = (refs: RefObject<HTMLElement | null>[], callback: () => void): void => {
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent): void => {
      const isClickOutside = refs.every((ref) => ref.current && !ref.current.contains(event.target as Node))

      if (isClickOutside) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [refs, callback])
}
