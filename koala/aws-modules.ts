/**
 * This file re-exports all AWS service implementations to make them easily available
 * throughout the application.
 */

// Re-export AWS services
export { 
  // Bedrock LLM services
  bedrockCall, 
  bedrockParseWithSchema, 
  createImagePrompt 
} from './bedrock-llm';

// Bedrock image generation
export { 
  generateImage, 
  createBedrockImage 
} from './bedrock-image';

// Amazon Polly TTS
export { 
  generateSpeechURL 
} from './speech-polly';

// Amazon Transcribe STT
export { 
  transcribeB64 
} from './transcribe-aws';

// AWS S3 Storage
export { 
  getSignedS3Url, 
  storeUrlToS3, 
  uploadBufferToS3, 
  createBlobID 
} from './storage-s3';

// AWS Configuration
export { 
  awsConfig, 
  s3Config, 
  bedrockConfig, 
  pollyConfig, 
  transcribeConfig 
} from './aws-config';

// Compatibility layer with original services
export { 
  openai, 
  gptCall, 
  createDallEPrompt, 
  createDallEImage 
} from './openai-aws';

export { 
  maybeGetCardImageUrl, 
  maybeAddImageToCard 
} from './image-aws';

export { 
  grammarCorrectionNext 
} from './grammar-aws';