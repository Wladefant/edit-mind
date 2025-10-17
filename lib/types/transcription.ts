export type Transcription = {
  segments: { words: { start: number; end: number; word: string }[] }[];
};
