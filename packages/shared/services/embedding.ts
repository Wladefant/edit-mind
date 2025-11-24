let extractor: any = null

async function getExtractor() {
  const { pipeline } = await import('@xenova/transformers')

  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')
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
    vectors.push(Array.from(output.data))
  }

  return vectors
}

export async function getEmbeddingDimension(): Promise<number> {
  const extractor = await getExtractor()
  const testOutput = await extractor('test', {
    pooling: 'mean',
    normalize: true,
  })
  return testOutput.data.length
}
