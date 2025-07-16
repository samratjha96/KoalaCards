// This is a replacement for the original openai.ts file using AWS Bedrock
import { bedrockCall, createImagePrompt, createBedrockImage } from './aws-services';
import { errorReport } from "./error-report";

// Mock OpenAI API for backward compatibility
export const openai = {
  chat: {
    completions: {
      create: async (opts: any) => {
        const messages = opts.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));

        const result = await bedrockCall({
          messages,
          max_tokens: opts.max_tokens || 1024,
          temperature: opts.temperature || 0.7,
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
      parse: async (opts: any) => {
        const messages = opts.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Handle schema parsing
        const schema = opts.response_format?.schema;
        if (schema) {
          try {
            const result = await bedrockCall({
              messages,
              max_tokens: opts.max_tokens || 1024,
              temperature: opts.temperature || 0.7,
              system: messages.find(m => m.role === "system")?.content,
              response_format: {
                type: "json_object",
                schema: schema,
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
          max_tokens: opts.max_tokens || 1024,
          temperature: opts.temperature || 0.7,
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
    generate: async (opts: any) => {
      const imageUrl = await createBedrockImage(opts.prompt, opts.prompt);
      
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
      create: async (opts: any) => {
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
        parse: async (opts: any) => {
          const messages = opts.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }));

          // Handle schema parsing
          const schema = opts.response_format?.schema;
          if (schema) {
            try {
              const result = await bedrockCall({
                messages,
                max_tokens: opts.max_tokens || 1024,
                temperature: opts.temperature || 0.7,
                system: messages.find(m => m.role === "system")?.content,
                response_format: {
                  type: "json_object",
                  schema: schema,
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
            max_tokens: opts.max_tokens || 1024,
            temperature: opts.temperature || 0.7,
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

export async function gptCall(opts: any) {
  return await openai.chat.completions.create(opts);
}

export const createDallEPrompt = async (
  term: string,
  definition: string,
) => {
  return await createImagePrompt(term, definition);
};

export const createDallEImage = async (prompt: string) => {
  return await createBedrockImage(prompt, prompt);
};