import OpenAI from 'openai';

const baseURL: string = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL: string = process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct';

// Provider-specific options
const API_PROVIDER_OPTIONS: Record<string, any> = {
  provider: {
    order: ["Groq"],
    allow_fallbacks: true
  }
};

/**
 * Resolves the chat API key.
 *
 * `AI_API_KEY` is the canonical name, but `OPENROUTER_API_KEY` is also accepted
 * because it predates the switch to the OpenAI SDK and may already exist in a
 * local .env file. See .env.example.
 */
function resolveApiKey(): string | undefined {
  return process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY;
}

// Client is created lazily so that a missing key only breaks the features that
// actually need an LLM (folder naming), instead of crashing the app on startup.
let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      throw new Error(
        'Missing chat API key: set AI_API_KEY (or OPENROUTER_API_KEY) in your .env file. See .env.example.'
      );
    }
    openai = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/ljbred08/ai-file-organizer',
        'X-Title': 'AI File Organizer'
      }
    });
  }
  return openai;
}

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
  const client = getClient();

  const apiTools = tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));

  try {
    const completion = await client.chat.completions.create({
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
