import { formatDuration, intervalToDuration } from 'date-fns'

export const humanizeSeconds = (seconds: number): string => {
  const durationObj = intervalToDuration({ start: 0, end: seconds * 1000 })

  // For very short (< 1 minute), show seconds
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  return formatDuration(durationObj, {
    delimiter: '',
  })
    .replace(/(\d+)\s+hours?/, '$1h')
    .replace(/(\d+)\s+minutes?/, '$1m')
    .replace(/(\d+)\s+seconds?/, '$1s')
}
