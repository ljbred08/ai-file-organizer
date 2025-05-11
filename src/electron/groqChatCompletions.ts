import { Groq } from 'groq-sdk';

const groq = new Groq({
 apiKey: process.env.GROQ_API_KEY,
});

/**
 * Gets chat completions from Groq based on the provided messages and tools.
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
export async function getChatCompletions(messages: any[], tools: { name: string; description: string; parameters: any; function: Function }[] = []): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable not set');
  }

  const groqTools = tools.map((tool) => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  });

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.1-8b-instant',
      tools: groqTools,
      tool_choice: groqTools.length > 0 ? 'auto' : undefined
    });

    return completion;
  } catch (error) {
    console.error('Error getting chat completions:', error);
    throw error;
  }
}

