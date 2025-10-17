import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'
import { VideoSearchParams } from '../types/search'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not set.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

const responseCache = new Map<string, { result: VideoSearchParams; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function generateActionFromPrompt(query: string, useCache = true): Promise<VideoSearchParams> {
  const cacheKey = query.toLowerCase().trim()

  if (useCache && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
    responseCache.delete(cacheKey)
  }

  const result = await generateActionFromPromptInternal(query)

  if (useCache) {
    responseCache.set(cacheKey, { result, timestamp: Date.now() })
  }

  return result
}

/**
 * Generates action from the prompt
 * @param query The user's query asking for a compilation.
 */
export async function generateActionFromPromptInternal(query: string): Promise<VideoSearchParams> {
  const prompt = `You are a video search parameter extraction assistant. Extract structured data from user queries.

STRICT REQUIREMENTS:
1. Return ONLY valid JSON, no markdown formatting
2. All fields must be present (use null or [] for missing values)
3. Ensure outputFilename is URL-safe and descriptive

FIELD SPECIFICATIONS:
- action: Main activity/subject (string, can be empty)
- emotions: Array of emotion keywords (valid: happy, sad, surprised, angry, neutral, excited, calm)
- shot_type: Camera framing (valid: "medium-shot", "long-shot", "close-up", or null)
- aspect_ratio: Video dimensions (valid: "16:9", "9:16", "1:1", "4:3", "8:7", or null)
- duration: Total seconds (positive integer or null)
- description: Natural language scene description (string, required)
- outputFilename: Kebab-case name without extension, max 50 chars (string, required)
- objects: Physical objects/items in scene (array of strings)

EXAMPLES:
Input: "Create a 30 second vertical video of me looking happy"
Output: {"action":"looking","emotions":["happy"],"shot_type":null,"aspect_ratio":"9:16","duration":30,"description":"person looking happy","outputFilename":"happy-vertical-30s","objects":[]}

Input: "2 minute video of @Ilias riding a bike outdoors"
Output: {"action":"riding a bike","emotions":[],"shot_type":"long-shot","aspect_ratio":null,"duration":120,"description":"person riding bicycle outdoors","outputFilename":"ilias-bike-ride-2min","objects":["bicycle"]}

Input: "Compile my happiest moments from last summer"
Output: {"action":"","emotions":["happy"],"shot_type":null,"aspect_ratio":null,"duration":null,"description":"happy summer moments","outputFilename":"happy-summer-moments","objects":[]}

USER QUERY: ${query}

Respond with ONLY the JSON object:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response

    const text = response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
    const parsed = JSON.parse(text)

    if (!parsed.outputFilename) {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      parsed.outputFilename = `video-${timestamp}`
    }

    return parsed
  } catch (error) {
    console.error('Error generating compilation clips:', error)
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return {
      action: query,
      emotions: [],
      outputFilename: `video-${timestamp}`,
      objects: [],
      duration: 120,
      aspect_ratio: '16:9',
      shot_type: 'long-shot',
      description: '',
    }
  }
}
