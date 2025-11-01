import { cleanup, generateActionFromPromptInternal } from '@/lib/services/llm'
import { describe, it, expect, afterEach } from 'vitest'
import { TEST_QUERIES, compareResults } from '../helpers/llm'

const TEST_TIMEOUT = 60000

afterEach(cleanup)

describe('Video Search Parameter Generation', () => {
  const runTest = async (query: string, expected?: Partial<any>) => {
    const result = await generateActionFromPromptInternal(query)
    if (expected) compareResults(result, expected)
  }

  describe('Core Functionality', () => {
    it('parses simple queries', () => runTest(TEST_QUERIES.simple.query, TEST_QUERIES.simple.expected), TEST_TIMEOUT)

    it(
      'handles complex multi-parameter queries',
      () => runTest(TEST_QUERIES.complex.query, TEST_QUERIES.complex.expected),
      TEST_TIMEOUT
    )

    it(
      'extracts transcription requirements',
      () => runTest(TEST_QUERIES.transcription.query, TEST_QUERIES.transcription.expected),
      TEST_TIMEOUT
    )
  })

  describe('Advanced Features', () => {
    it(
      'identifies objects in scene',
      () => runTest(TEST_QUERIES.withObjects.query, TEST_QUERIES.withObjects.expected),
      TEST_TIMEOUT
    )

    it(
      'parses multiple emotions',
      () => runTest(TEST_QUERIES.multiEmotion.query, TEST_QUERIES.multiEmotion.expected),
      TEST_TIMEOUT
    )

    it(
      'detects aspect ratio requirements',
      () => runTest(TEST_QUERIES.aspectRatio.query, TEST_QUERIES.aspectRatio.expected),
      TEST_TIMEOUT
    )
    it(
      'detects shot type requirements',
      () => runTest(TEST_QUERIES.shotType.query, TEST_QUERIES.shotType.expected),
      TEST_TIMEOUT
    )
  })

  describe('Action Field Integrity', () => {
    it(
      'returns action as string primitive',
      async () => {
        const queries = ['Show me running clips', 'Find videos where I am cooking', 'Videos of me laughing']

        await Promise.all(queries.map((query) => runTest(query)))
      },
      TEST_TIMEOUT * 2
    )
  })

  describe('Edge Cases', () => {
    it(
      'handles minimal input gracefully',
      async () => {
        const edgeCases = ['video', 'a', 'create clip', 'show me stuff']
        await Promise.all(edgeCases.map((query) => runTest(query)))
      },
      TEST_TIMEOUT * 2
    )

    it(
      'sanitizes filenames correctly',
      async () => {
        const queries = ["John's @birthday party!!!", "video with 'special' characters#$%", 'UPPERCASE VIDEO NAME']
        await Promise.all(queries.map((query) => runTest(query)))
      },
      TEST_TIMEOUT * 2
    )
  })

  describe('Consistency', () => {
    it(
      'produces consistent results with low temperature',
      async () => {
        const query = '30 second happy video with music'
        const [result1, result2] = await Promise.all([
          generateActionFromPromptInternal(query),
          generateActionFromPromptInternal(query),
        ])

        expect(result1.emotions).toEqual(result2.emotions)
        expect(result1.duration).toEqual(result2.duration)
        expect(result1.aspect_ratio).toEqual(result2.aspect_ratio)
      },
      TEST_TIMEOUT * 2
    )
  })
})
