/**
 * Image generation using AWS Bedrock Stable Diffusion
 */
import { 
  BedrockRuntimeClient, 
  InvokeModelCommand 
} from "@aws-sdk/client-bedrock-runtime";
import { errorReport } from "./error-report";
import { bedrockConfig } from "./aws-config";
import { getAwsClientConfig } from "./aws-credential-config";

// Create Bedrock client with proper credential chain
const bedrockClient = new BedrockRuntimeClient(getAwsClientConfig());

// Stability AI Stable Diffusion parameters
interface StableDiffusionParams {
  text_prompts: Array<{
    text: string;
    weight?: number;
  }>;
  height?: number;
  width?: number;
  cfg_scale?: number;
  clip_guidance_preset?: string;
  sampler?: string;
  samples?: number;
  seed?: number;
  steps?: number;
  style_preset?: string;
  negative_prompts?: Array<{
    text: string;
    weight?: number;
  }>;
}

interface StableDiffusionResponse {
  result: string;
  artifacts: Array<{
    seed: number;
    base64: string;
    finishReason: string;
  }>;
}

/**
 * Generate an image using AWS Bedrock Stable Diffusion
 * @param prompt The text prompt to generate an image from
 * @returns A Base64 string of the generated image
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Build request parameters for Stable Diffusion
    const requestParams: StableDiffusionParams = {
      text_prompts: [
        {
          text: prompt,
          weight: 1.0
        },
        {
          text: "blurry, bad, text, watermark, signature, deformed, ugly, low quality",
          weight: -1.0
        }
      ],
      height: 1024,
      width: 1024,
      cfg_scale: 7,
      clip_guidance_preset: "FAST_BLUE",
      sampler: "K_DPM_2_ANCESTRAL",
      samples: 1,
      steps: 50,
      style_preset: "photographic"
    };

    // Create command to invoke the model
    const command = new InvokeModelCommand({
      modelId: bedrockConfig.imageModelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestParams),
    });

    // Send the request to Bedrock
    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = new TextDecoder().decode(response.body);
    const parsedResponse = JSON.parse(responseBody) as StableDiffusionResponse;

    // Extract the Base64 image from the response
    if (parsedResponse.artifacts && parsedResponse.artifacts.length > 0) {
      return `data:image/png;base64,${parsedResponse.artifacts[0].base64}`;
    } else {
      return errorReport("No image artifacts returned from Stable Diffusion");
    }
  } catch (error) {
    return errorReport(`Failed to generate image: ${error}`);
  }
}