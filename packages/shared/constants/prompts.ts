// constants/prompts.ts
export const SEARCH_PROMPT = (query: string) => `You are a precise video search parameter extractor. Extract structured data from the user's query.

Query: "${query}"

Instructions:
1. **duration** (number|null): Convert time mentions to seconds
   - "30 second" / "30s" / "30 sec" → 30
   - "2 minute" / "2 min" / "2m" → 120
   - "1.5 minutes" → 90
   - "5 min" → 300
   - If no duration mentioned → null

2. **aspect_ratio** (string): Detect format keywords
   - "vertical" / "portrait" / "TikTok" / "Stories" / "9:16" → "9:16"
   - "square" / "Instagram post" / "1:1" → "1:1"
   - "horizontal" / "landscape" / "16:9" → "16:9"
   - "4:3" → "4:3"
   - "8:7" → "8:7"
   - Default → "16:9"

3. **emotions** (string[]): Extract emotion words
   - Examples: happy, sad, angry, surprised, excited, neutral, fearful, disgusted
   - Normalize to lowercase
   - Return empty array if none mentioned

4. **shot_type** (string|null): Detect camera framing
   - "close-up" / "closeup" / "close up" → "close-up"
   - "medium-shot" / "medium shot" / "waist up" → "medium-shot"
   - "long-shot" / "long shot" / "wide shot" / "full body" → "long-shot"
   - If not mentioned → null

5. **objects** (string[]): Extract physical items mentioned
   - Examples: laptop, dog, pan, knife, car, phone
   - Normalize to lowercase singular form
   - Return empty array if none

6. **action** (string|null): Main activity/verb
   - Examples: cooking, running, talking, walking, dancing
   - Extract the main action verb
   - null if no clear action

7. **transcriptionQuery** (string|null): Spoken word search
   - Extract quoted text after "say", "says", "said", "saying"
   - Example: "where I say 'hello world'" → "hello world"
   - null if not searching for speech

8. **description** (string): Brief summary of what user wants
   - If query is empty → "No query provided"
   - Otherwise, rephrase the query briefly

9. **faces** (string[]): Extract @mentions or person names
   - "@John" → ["john"]
   - "@Ilias" → ["ilias"]
   - Normalize to lowercase, remove @ symbol

Return ONLY valid JSON (no markdown, no explanation):
{
  "action": string | null,
  "emotions": string[],
  "objects": string[],
  "duration": number | null,
  "shot_type": "close-up" | "medium-shot" | "long-shot" | null,
  "aspect_ratio": "16:9" | "9:16" | "1:1" | "4:3" | "8:7",
  "transcriptionQuery": string | null,
  "description": string,
  "faces": string[]
}

Examples:
Query: "Create a 30 second vertical video of me looking happy"
{"action": null, "emotions": ["happy"], "objects": [], "duration": 30, "shot_type": null, "aspect_ratio": "9:16", "transcriptionQuery": null, "description": "30 second vertical video with happy emotion", "faces": []}

Query: "Find all close-ups where @Ilias is surprised and there's a laptop"
{"action": null, "emotions": ["surprised"], "objects": ["laptop"], "duration": null, "shot_type": "close-up", "aspect_ratio": "16:9", "transcriptionQuery": null, "description": "Close-up shots of Ilias looking surprised with laptop", "faces": ["ilias"]}

Query: "Show me clips where I say 'machine learning is awesome'"
{"action": null, "emotions": [], "objects": [], "duration": null, "shot_type": null, "aspect_ratio": "16:9", "transcriptionQuery": "machine learning is awesome", "description": "Clips with speech: machine learning is awesome", "faces": []}

Now extract from the query above. Return ONLY the JSON object:`



export const ASSISTANT_MESSAGE_PROMPT = (userPrompt: string, resultsCount: number) => `
You are a helpful video assistant.
User request: "${userPrompt}"
Results found: ${resultsCount}

Instructions:
- Reply in 1-2 friendly sentences.
- Mention the result count explicitly.
- Propose the next step (e.g., creating the video, showing preview).
- Example: "I found 5 clips of you smiling! Shall I compile them?"

Response:`

export const VIDEO_COMPILATION_MESSAGE_PROMPT = (userPrompt: string, resultsCount: number) => `
You are a helpful video-compilation assistant.
User request: "${userPrompt}"
Clips matched: ${resultsCount}

Instructions:
- Reply in 1–2 friendly sentences.
- Mention the number of matching clips clearly.
- Suggest the next step (e.g., compiling them, choosing style, trimming, or previewing).
- Keep the tone creative but concise.
- Example: "I found 12 clips that fit your 'energetic montage' idea! Want me to stitch them into a first draft?"

Response:`


export const GENERAL_RESPONSE_PROMPT = (userPrompt: string, chatHistory: string) => `
You are a friendly video library AI.
User said: "${userPrompt}"
History: ${chatHistory || "None"}

Instructions:
- Respond naturally (1-3 sentences).
- If the intent is unclear, mention your capabilities (Search, Compilation, Analytics).
- Be conversational.

Response:`

export const CLASSIFY_INTENT_PROMPT = (query: string) => `
Classify the user intent.

Query: "${query}"

Categories:
- "compilation": Creating, finding, searching videos/scenes.
- "analytics": Counting stats, dates, duration.
- "general": Greetings, questions about the AI.

Output JSON only:
{
  "type": "compilation" | "analytics" | "general",
  "needsVideoData": boolean
}

Examples:
"Make a video" -> {"type": "compilation", "needsVideoData": true}
"How many clips?" -> {"type": "analytics", "needsVideoData": true}
"Hi" -> {"type": "general", "needsVideoData": false}
`

export const ANALYTICS_RESPONSE_PROMPT = (userPrompt: string, analytics: any) => {
  const emotionList = Object.entries(analytics.emotionCounts || {})
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([emotion, count]) => `${emotion} (${count})`)
    .join(', ')

  const peopleList = Object.entries(analytics.faceOccurrences || {})
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([name]) => `@${name}`)
    .join(', ')

  return `You are an enthusiastic video library assistant analyzing a user's video collection.

User Question: "${userPrompt}"

Video Library Statistics:
- Total Videos: ${analytics.uniqueVideos ?? 0}
- Total Scenes: ${analytics.totalScenes ?? 0}
- Total Duration: ${analytics.totalDurationFormatted || analytics.totalDuration + ' seconds'}
- Average Scene Duration: ${analytics.averageSceneDuration ?? 0} seconds
- Top Emotions: ${emotionList || 'None detected'}
- Featured People: ${peopleList || 'None detected'}
${analytics.dateRange ? `- Date Range: ${analytics.dateRange.oldest?.toLocaleDateString()} to ${analytics.dateRange.newest?.toLocaleDateString()}` : ''}

Instructions:
1. Answer the user's specific question directly using the statistics provided
2. Be enthusiastic and conversational (use exclamation marks!)
3. Include specific numbers from the data
4. Keep response to 2-4 sentences
5. Highlight the most interesting or impressive statistics

Response:`
}