import { parse } from 'date-fns';

export function convertTimeToWords(timeString?: string): string {
  if(!timeString)  return '0 seconds' 
  const parsedDate = parse(timeString, 'mm:ss', new Date(0))

  const minutes = parsedDate.getMinutes()
  const seconds = parsedDate.getSeconds()

  const minuteText = minutes === 1 ? 'minute' : 'minutes'
  const secondText = seconds === 1 ? 'second' : 'seconds'

  if (minutes > 0 && seconds > 0) {
    return `${minutes} ${minuteText} and ${seconds} ${secondText}`
  } else if (minutes > 0) {
    return `${minutes} ${minuteText}`
  } else if (seconds > 0) {
    return `${seconds} ${secondText}`
  } else {
    return '0 seconds' 
  }
}
