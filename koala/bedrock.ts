/**
 * AWS Bedrock implementation for LLM and image generation features
 */
import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { errorReport } from "./error-report";
import { bedrockConfig } from "./aws-config";
import { getAwsClientConfig } from "./aws-credential-config";
import { generateImage } from "./bedrock-image";

// Create Bedrock client with proper credential chain
const bedrockClient = new BedrockRuntimeClient(getAwsClientConfig());

// Generic type for model responses
type ModelResponse<T> = {
  response: T;
};

// Claude message types
interface ClaudeMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: string;
    text?: string;
  }>;
}

interface ClaudeParams {
  messages: ClaudeMessage[];
  anthropic_version?: string;
  max_tokens: number;
  temperature?: number;
  system?: string;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  response_format?: {
    type: string;
    schema?: Record<string, unknown>;
  };
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Call AWS Bedrock Claude model
export async function bedrockCall(params: {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  system?: string;
  response_format?: { type: string; schema?: Record<string, unknown> };
}): Promise<ModelResponse<ClaudeResponse>> {
  try {
    // Format messages for Claude
    const claudeMessages = params.messages.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    const claudeParams: ClaudeParams = {
      messages: claudeMessages,
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: params.max_tokens || 1024,
      temperature: params.temperature || 0.7,
    };

    // Add optional parameters if provided
    if (params.system) {
      claudeParams.system = params.system;
    }

    if (params.response_format) {
      claudeParams.response_format = params.response_format;
    }

    // Create command to invoke the model
    const command = new InvokeModelCommand({
      modelId: bedrockConfig.textModelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(claudeParams),
    });

    // Send the request to Bedrock
    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = new TextDecoder().decode(response.body);
    const parsedResponse = JSON.parse(responseBody) as ClaudeResponse;

    return { response: parsedResponse };
  } catch (error) {
    return errorReport(`Bedrock API Error: ${error}`);
  }
}

// Function to parse JSON schema responses from Claude
export async function bedrockParseWithSchema<T>(params: {
  messages: Array<{ role: string; content: string }>;
  schema: Record<string, unknown>;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}): Promise<T> {
  try {
    const result = await bedrockCall({
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      response_format: {
        type: "json_object",
        schema: params.schema,
      },
    });

    // Extract the content from the response
    const content = result.response.content[0]?.text;
    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON content
    return JSON.parse(content) as T;
  } catch (error) {
    return errorReport(`Schema parsing error: ${error}`);
  }
}

// Create a prompt for image generation using Claude
export const createImagePrompt = async (
  term: string,
  definition: string,
): Promise<string> => {
  const shortCard = term.split(" ").length < 2;
  const promptType = shortCard ? "SINGLE_WORD" : "SENTENCE";
  
  const systemPrompt = 
    promptType === "SINGLE_WORD" 
      ? `You are a language learning flash card app.
         Create a stable diffusion prompt to generate an image of the foreign language word.
         Make it as realistic and accurate to the word's meaning as possible.
         The illustration must convey the word's meaning to the student.
         humans must be shown as anthropomorphized animals.
         Do not add text. It will give away the answer!`
      : `You are a language learning flash card app.
         You are creating a comic to help users remember the flashcard above.
         It is a fun, single-frame comic that illustrates the sentence.
         Create a stable diffusion prompt to create this comic for the card above.
         Do not add speech bubbles or text. It will give away the answer!
         All characters must be Koalas.`;

  try {
    const result = await bedrockCall({
      messages: [
        {
          role: "user",
          content: [`TERM: ${term}`, `DEFINITION: ${definition}`].join("\n"),
        }
      ],
      max_tokens: 128,
      temperature: 1.0,
      system: systemPrompt,
    });

    const content = result.response.content[0]?.text;
    if (!content) {
      return errorReport("No image prompt generated.");
    }
    
    return content;
  } catch (error) {
    return errorReport(`Failed to create image prompt: ${error}`);
  }
}

// Generate image using Stable Diffusion
export const createBedrockImage = async (prompt: string) => {
  return await generateImage(prompt);
};

// For compatibility with existing code that uses OpenAI interfaces
export const openai = {
  chat: {
    completions: {
      create: async (opts: Record<string, unknown>) => {
        const messages = (opts.messages as Array<{role: string; content: string}>).map((msg: {role: string; content: string}) => ({
          role: msg.role,
          content: msg.content,
        }));

        const result = await bedrockCall({
          messages,
          max_tokens: (opts.max_tokens as number) || 1024,
          temperature: (opts.temperature as number) || 0.7,
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
      parse: async (opts: Record<string, unknown>) => {
        const messages = (opts.messages as Array<{role: string; content: string}>).map((msg: {role: string; content: string}) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Handle schema parsing
        const schema = (opts.response_format as {schema?: Record<string, unknown>})?.schema;
        if (schema) {
          try {
            const result = await bedrockCall({
              messages,
              max_tokens: (opts.max_tokens as number) || 1024,
              temperature: (opts.temperature as number) || 0.7,
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
          max_tokens: (opts.max_tokens as number) || 1024,
          temperature: (opts.temperature as number) || 0.7,
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
      create: async (_opts: Record<string, unknown>) => {
        // This is handled by transcribe.ts
        return {
          text: "Transcription not available via this interface. Use transcribeB64 instead.",
        };
      },
    },
  },
  beta: {
    chat: {
      completions: {
        parse: async (opts: Record<string, unknown>) => {
          return await openai.chat.completions.parse(opts);
        },
      },
    },
  },
};

// Legacy function for backward compatibility
export async function gptCall(opts_: Record<string, unknown>) {
  return await openai.chat.completions.create(opts_);
}

// Legacy functions for backward compatibility
export const createDallEPrompt = createImagePrompt;
export const createDallEImage = createBedrockImage;