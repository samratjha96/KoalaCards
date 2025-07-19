import { 
  BedrockRuntimeClient, 
  InvokeModelCommand
  // InvokeModelWithResponseStreamCommand is removed as it's unused
} from "@aws-sdk/client-bedrock-runtime";
import { errorReport } from "./error-report";
import { awsConfig, bedrockConfig } from "./aws-config";

// Create Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

// Generic type for model responses
type ModelResponse<T> = {
  response: T;
};

// For Claude models
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

// Create a DALL-E style prompt using Claude
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
};