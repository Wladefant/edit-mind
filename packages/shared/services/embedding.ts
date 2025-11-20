import { pipeline } from '@xenova/transformers';

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/bge-m3"
    );
  }
  return extractor;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const vectors: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    vectors.push(Array.from(output.data));
  }

  return vectors;
}
