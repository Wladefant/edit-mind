export const humanizeFileName = (source: string): string => {
  return source.split('/')[source.split('/').length - 1]
}
