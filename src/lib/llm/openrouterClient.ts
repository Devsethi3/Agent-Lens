import { ENHANCE_BEHAVIOR_SYSTEM_PROMPT, buildEnhanceUserPrompt } from './prompts'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const TARGET_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'

interface LLMResponse {
  success: boolean
  data?: string
  error?: string
}

export async function enhanceMarkdown(rawMarkdown: string): Promise<LLMResponse> {
  const apiKey = process.env.PLASMO_PUBLIC_OPENROUTER_API_KEY

  if (!apiKey) {
    return { 
      success: false, 
      error: 'OpenRouter API key is missing. Please add it to your .env file (PLASMO_PUBLIC_OPENROUTER_API_KEY).' 
    }
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agentlens.dev', // Identifies your app on OpenRouter
        'X-Title': 'AgentLens Extension'
      },
      body: JSON.stringify({
        model: TARGET_MODEL,
        messages: [
          { role: 'system', content: ENHANCE_BEHAVIOR_SYSTEM_PROMPT },
          { role: 'user', content: buildEnhanceUserPrompt(rawMarkdown) }
        ],
        temperature: 0.2, // Low temperature for strict factual adherence
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[AgentLens] OpenRouter API Error:', errorBody)
      return { 
        success: false, 
        error: `API Error (${response.status}): ${response.statusText}` 
      }
    }

    const data = await response.json()

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return { success: true, data: data.choices[0].message.content }
    }

    return { success: false, error: 'Invalid response structure from LLM' }
  } catch (error) {
    console.error('[AgentLens] Network/LLM Error:', error)
    return { success: false, error: 'Failed to connect to OpenRouter. Check your network connection.' }
  }
}