import OpenAI from 'openai';

const apiKey: string|undefined = process.env.AI_API_KEY;
const baseURL: string = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL: string = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct';

// Provider-specific options
const API_PROVIDER_OPTIONS: Record<string, any> = {
  provider: {
    order: ["Groq"],
    allow_fallbacks: true
  }
};

if (!apiKey) {
  throw new Error('*_API_KEY environment variable not set');
}
const openai = new OpenAI({
  apiKey,
  baseURL,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/yourusername/ai-file-organizer', // Replace with your actual repository URL
    'X-Title': 'AI File Organizer'
  }
});

/**
 * Gets chat completions from OpenRouter based on the provided messages and tools.
 * @param {any[]} messages - Array of messages for the chat completion.
 * @param {{ function: Function; description: string }[]} [tools=[]] - Optional array of tools with their descriptions.
 * @returns {Promise<any>} - Promise resolving to the chat completion response.
 * @example
 * const tools = [
 * { function: myToolFunction, description: 'This is my tool function' }
 * ];
 * const messages = [{ role: 'user', content: 'Hello' }];
 * getChatCompletions(messages, tools).then((completion) => console.log(completion));
 */
export async function getChatCompletions(
  messages: any[],
  tools: { name: string; description: string; parameters: any; function: Function }[] = [],
  model: string = DEFAULT_MODEL
): Promise<any> {
  

  const apiTools = tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));

  try {
    const completion = await openai.chat.completions.create({
      messages,
      model,
      tools: apiTools,
      tool_choice: apiTools.length > 0 ? 'auto' : undefined,
      ...API_PROVIDER_OPTIONS
    });

    return completion;
  } catch (error) {
    console.error('Error getting chat completions:', error);
    throw error;
  }
} 