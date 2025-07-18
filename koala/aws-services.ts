/**
 * This file provides a central export point for all AWS services used in the application.
 */

// Export AWS Bedrock LLM implementations
export {
  bedrockCall,
  bedrockParseWithSchema,
  createImagePrompt,
  createBedrockImage,
  
  // For backward compatibility
  openai,
  gptCall,
  createDallEPrompt,
  createDallEImage
} from './bedrock';

// Export Storage implementations
export {
  getSignedS3Url,
  storeUrlToS3,
  uploadBufferToS3,
  createBlobID,
  
  // For backward compatibility
  bucket,
  expiringUrl,
  storeURLGoogleCloud
} from './storage';

// Export Speech implementations
export { generateSpeechURL } from './generate-speech-url';
export { generateLessonAudio } from './speech';

// Export Transcription implementations
export { transcribeB64 } from './transcribe';

// Export Grammar correction
export { grammarCorrectionNext } from './grammar';

// Export Image generation implementations
export { 
  maybeGetCardImageUrl,
  maybeAddImageToCard
} from './image';

// AWS Configuration
export { 
  awsConfig, 
  s3Config, 
  bedrockConfig, 
  pollyConfig, 
  transcribeConfig 
} from './aws-config';