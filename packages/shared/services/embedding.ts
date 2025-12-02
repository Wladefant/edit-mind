import { FeatureExtractionPipeline } from '@xenova/transformers';

let extractor: FeatureExtractionPipeline | null = null

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  const { pipeline } = await import('@xenova/transformers')

  if (!extractor) {
    extractor = (await pipeline(
      'feature-extraction',
      'Xenova/all-mpnet-base-v2'
    )) as FeatureExtractionPipeline
  }
  return extractor
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor()
  const vectors: number[][] = []

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    vectors.push(Array.from(output.data as Float32Array))
  }

  return vectors
}

export async function getEmbeddingDimension(): Promise<number> {
  const extractor = await getExtractor()
  const testOutput = await extractor('test', {
    pooling: 'mean',
    normalize: true,
  })
  return (testOutput.data as Float32Array).length
}
