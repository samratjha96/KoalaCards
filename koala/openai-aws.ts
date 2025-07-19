// This is a replacement for the original openai.ts file using AWS Bedrock
import { bedrockCall, createImagePrompt, createBedrockImage } from './aws-services';
import { errorReport } from "./error-report";

// Define proper type interfaces for OpenAI-compatible request and response formats
interface OpenAIRequestOptions {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  response_format?: ResponseFormat;
  [key: string]: unknown;
}

interface ResponseFormat {
  type: string;
  schema?: Record<string, unknown>;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
      parsed?: unknown;
    };
  }>;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// Mock OpenAI API for backward compatibility
export const openai = {
  chat: {
    completions: {
      create: async (opts: OpenAIRequestOptions) => {
        // Map the messages to the format expected by bedrockCall
        const messages = opts.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const result = await bedrockCall({
          messages,
          max_tokens: typeof opts.max_tokens === 'number' ? opts.max_tokens : 1024,
          temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
          system: messages.find(m => m.role === "system")?.content,
        });

        // Map response to OpenAI format
        return {
          choices: [
            {
              message: {
                content: result.response.content[0]?.text || "",
                role: "assistant",
              },
            },
          ],
          usage: {
            total_tokens: result.response.usage.input_tokens + result.response.usage.output_tokens,
            prompt_tokens: result.response.usage.input_tokens,
            completion_tokens: result.response.usage.output_tokens,
          },
        };
      },
      parse: async (opts: OpenAIRequestOptions) => {
        // Map the messages to the format expected by bedrockCall
        const messages = opts.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Get schema from response_format if it exists
        const responseFormat = opts.response_format;
        const schema = responseFormat?.schema;
        
        if (schema) {
          try {
            const result = await bedrockCall({
              messages,
              max_tokens: typeof opts.max_tokens === 'number' ? opts.max_tokens : 1024,
              temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
              system: messages.find(m => m.role === "system")?.content,
              response_format: {
                type: "json_object",
                schema,
              },
            });

            const content = result.response.content[0]?.text || "{}";
            const parsed = JSON.parse(content);

            return {
              choices: [
                {
                  message: {
                    content: content,
                    parsed: parsed,
                  },
                },
              ],
            };
          } catch (error) {
            return errorReport(`Schema parsing error: ${error}`);
          }
        }

        // Handle regular responses
        const result = await bedrockCall({
          messages,
          max_tokens: typeof opts.max_tokens === 'number' ? opts.max_tokens : 1024,
          temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
          system: messages.find(m => m.role === "system")?.content,
        });

        return {
          choices: [
            {
              message: {
                content: result.response.content[0]?.text || "",
                parsed: null,
              },
            },
          ],
        };
      },
    },
  },
  images: {
    generate: async (opts: {prompt: string}) => {
      const imageUrl = await createBedrockImage(opts.prompt);
      
      return {
        data: [
          {
            url: imageUrl,
          },
        ],
      };
    },
  },
  audio: {
    transcriptions: {
      create: async (_opts: unknown) => {
        // This is handled by transcribe-aws.ts
        // We need to redirect the calls, but for now just provide a stub
        return {
          text: "Transcription not available via this interface. Use transcribeB64 instead.",
        };
      },
    },
  },
  beta: {
    chat: {
      completions: {
        parse: async (opts: OpenAIRequestOptions) => {
          // Map the messages to the format expected by bedrockCall
          const messages = opts.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          // Get schema from response_format if it exists
          const responseFormat = opts.response_format;
          const schema = responseFormat?.schema;
          
          if (schema) {
            try {
              const result = await bedrockCall({
                messages,
                max_tokens: typeof opts.max_tokens === 'number' ? opts.max_tokens : 1024,
                temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.7,
                system: messages.find(m => m.role === "system")?.content,
                response_format: {
                  type: "json_object",
                  schema,
                },
              });

              const content = result.response.content[0]?.text || "{}";
              const parsed = JSON.parse(content);

              return {
                choices: [
                  {
                    message: {
                      content: content,
                      parsed: parsed,
                    },
                  },
                ],
              };
            } catch (error) {
              return errorReport(`Schema parsing error: ${error}`);
            }
          }

          // Handle regular responses
          const result = await bedrockCall({
            messages,
            max_tokens: opts.max_tokens ? Number(opts.max_tokens) : 1024,
            temperature: opts.temperature ? Number(opts.temperature) : 0.7,
            system: messages.find(m => m.role === "system")?.content,
          });

          return {
            choices: [
              {
                message: {
                  content: result.response.content[0]?.text || "",
                  parsed: null,
                },
              },
            ],
          };
        },
      },
    },
  },
};

export async function gptCall(opts: OpenAIRequestOptions): Promise<OpenAIResponse> {
  return await openai.chat.completions.create(opts);
}

export const createDallEPrompt = async (
  term: string,
  definition: string,
) => {
  return await createImagePrompt(term, definition);
};

export const createDallEImage = async (prompt: string) => {
  return await createBedrockImage(prompt);
};