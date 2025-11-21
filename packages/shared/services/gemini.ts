import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'
import { VideoSearchParams } from '../types/search'
import { CACHE_TTL, GEMINI_API_KEY } from '../constants'
import { getVideoAnalytics } from '../utils/analytics'

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

const responseCache = new Map<string, { result: VideoSearchParams; timestamp: number }>()

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
- faces: Array of person names mentioned (extract @mentions and names, array of strings)
- locations: Array of location names (indoor, outdoor, office, beach, etc., array of strings)
- transcriptionQuery: Exact text to search for in video transcriptions (string or null)
- semanticQuery: Conceptual/contextual search terms for ranking (string or null)
  * Extract abstract concepts like "brainstorming", "celebrating", "discussing"
  * Relationship phrases like "working together", "presenting to"
  * Context that goes beyond exact keywords

EXAMPLES:
Input: "Show me scenes with @Ilias and @Pierre talking about Strapi outdoors"
Output: {
  "action":"talking",
  "emotions":[],
  "shot_type":null,
  "aspect_ratio":null,
  "duration":null,
  "description":"Ilias and Pierre talking about Strapi outdoors",
  "outputFilename":"ilias-pierre-strapi-outdoors",
  "objects":[],
  "faces":["Ilias","Pierre"],
  "locations":["outdoor"],
  "transcriptionQuery":"Strapi",
  "semanticQuery":"talking about discussing collaboration"
}

Input: "Find exciting product launch moments"
Output: {
  "action":"",
  "emotions":["excited"],
  "shot_type":null,
  "aspect_ratio":null,
  "duration":null,
  "description":"exciting product launch moments",
  "outputFilename":"exciting-product-launch",
  "objects":[],
  "faces":[],
  "locations":[],
  "transcriptionQuery":null,
  "semanticQuery":"product launch announcement reveal celebration applause excitement"
}

Input: "Clips where @Sarah is brainstorming with the team"
Output: {
  "action":"brainstorming",
  "emotions":[],
  "shot_type":null,
  "aspect_ratio":null,
  "duration":null,
  "description":"Sarah brainstorming with team",
  "outputFilename":"sarah-team-brainstorming",
  "objects":["whiteboard"],
  "faces":["Sarah"],
  "locations":["indoor"],
  "transcriptionQuery":null,
  "semanticQuery":"brainstorming collaboration discussing ideas planning whiteboard session"
}

USER QUERY: ${query}

Respond with ONLY the JSON object:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response

    const text = response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(text)

    if (!parsed.outputFilename) {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      parsed.outputFilename = `video-${timestamp}`
    }

    return parsed
  } catch (error) {
    console.error('Error generating search query:', error)
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return {
      action: query,
      emotions: [],
      outputFilename: `video-${timestamp}`,
      objects: [],
      duration: 120,
      aspect_ratio: '16:9',
      shot_type: 'long-shot',
      description: query,
      transcriptionQuery: undefined,
    }
  }
}
export async function generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<string> {

  const prompt = `You are a helpful video compilation assistant. The user requested: "${userPrompt}"

You found ${resultsCount} video scenes matching their request.

Respond with a brief, friendly message (1-2 sentences) acknowledging their request and what you found. Be conversational and helpful.

Examples:
- "I found 15 clips matching your description! Ready to compile them into your video."
- "Great! I've located 8 happy moments from your summer videos."
- "Found 12 scenes where you're riding a bike outdoors. Let me know if you'd like to proceed!"

Your response:`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating assistant message:', error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateCompilationResponse(userPrompt: string, resultsCount: number): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  const prompt = `You are a helpful video compilation assistant. The user requested: "${userPrompt}"

You found ${resultsCount} video scenes matching their request.

Respond with a brief, friendly message (1-2 sentences) acknowledging their request and what you found. Be conversational and helpful.

Examples:
- "I found 15 clips matching your description! Ready to compile them into your video."
- "Great! I've located 8 happy moments from your summer videos."
- "Found 12 scenes where you're riding a bike outdoors. Let me know if you'd like to proceed!"

Your response:`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating compilation message:', error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateGeneralResponse(userPrompt: string, chatHistory?: any[]): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\n\nRecent conversation:\n${chatHistory
          .slice(-5)
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : ''

  const prompt = `You are a friendly, helpful AI assistant for a video library application. You help users:
1. Search and compile their videos
2. Get analytics and insights about their video collection
3. Have casual conversations

The user said: "${userPrompt}"${historyContext}

Respond naturally and helpfully (1-3 sentences). If they're asking what you can do, mention you can:
- Create video compilations based on descriptions, people, emotions, etc.
- Answer questions about their video library (duration, counts, statistics)
- Search for specific moments or phrases in videos

Your response:`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating general response:', error)
    return "I'm your video library assistant! I can help you create compilations, analyze your videos, or just chat. What would you like to do?"
  }
}

export async function classifyIntent(prompt: string): Promise<{
  type: 'compilation' | 'analytics' | 'general'
  needsVideoData: boolean
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  const classificationPrompt = `Classify this user query about their video library:

Query: "${prompt}"

Determine:
1. Type: 
   - "compilation" = user wants to create/find/compile videos (e.g., "make a video of...", "show me clips where...", "compile my...")
   - "analytics" = user wants statistics/information about their videos (e.g., "how many videos...", "total duration...", "when did I...", "do I have...")
   - "general" = casual conversation, questions about the app, or unclear requests

2. needsVideoData: true if you need to query the video database to answer, false otherwise

Respond with ONLY valid JSON:
{"type": "compilation" | "analytics" | "general", "needsVideoData": true | false}

Examples:
"Create a 30 second video of me looking happy" -> {"type":"compilation","needsVideoData":true}
"How many videos of @ilias do I have?" -> {"type":"analytics","needsVideoData":true}
"What's the total duration of my outdoor videos?" -> {"type":"analytics","needsVideoData":true}
"Hello, how are you?" -> {"type":"general","needsVideoData":false}
"What can you do?" -> {"type":"general","needsVideoData":false}

Your response:`

  try {
    const result = await model.generateContent(classificationPrompt)
    const text = result.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(text)
  } catch (error) {
    console.error('Error classifying intent:', error)
    // Default to compilation for backward compatibility
    return { type: 'compilation', needsVideoData: true }
  }
}

export async function generateAnalyticsResponse(
  userPrompt: string,
  analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  const analyticsPrompt = `You are a friendly, knowledgeable video library assistant. The user asked: "${userPrompt}"

Here's what you found in their video library:
- Total videos: ${analytics.uniqueVideos}
- Total scenes: ${analytics.totalScenes}
- Total duration: ${analytics.totalDurationFormatted} (${analytics.totalDuration} seconds)
${analytics.dateRange ? `- Date range: ${analytics.dateRange.oldest.toLocaleDateString()} to ${analytics.dateRange.newest.toLocaleDateString()}` : ''}
${
  Object.keys(analytics.emotionCounts).length > 0
    ? `- Emotions detected: ${Object.entries(analytics.emotionCounts)
        .map(([e, c]) => `${e} (${c})`)
        .join(', ')}`
    : ''
}
${
  Object.keys(analytics.faceOccurrences).length > 0
    ? `- People appearing: ${Object.entries(analytics.faceOccurrences)
        .map(([f, c]) => `@${f} appears in ${c} scenes`)
        .join(', ')}`
    : ''
}

Respond naturally and conversationally (2-4 sentences). Include specific numbers and insights. Be enthusiastic and helpful.

Examples of good responses:
- "You have 23 videos featuring @ilias, totaling about 12 minutes and 34 seconds of footage! They appear across 45 different scenes."
- "I found 8 outdoor videos in your library with a total duration of 5m 23s. Most of them were shot in long-shot perspective!"
- "Looking at your summer videos, you have 156 happy moments captured across 3h 24m of footage. Your happiest month was July with 89 scenes! 🎉"

Your response:`

  try {
    const result = await model.generateContent(analyticsPrompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Error generating analytics response:', error)
    return `I found ${analytics.uniqueVideos} videos (${analytics.totalScenes} scenes) with a total duration of ${analytics.totalDurationFormatted}.`
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

  for (const text of texts) {
    const result = await model.embedContent(text)
    embeddings.push(result.embedding.values)
  }

  return embeddings
}
