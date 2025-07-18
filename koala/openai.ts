// Reexport Bedrock functions as OpenAI compatibility layer
// This file is kept for backward compatibility during migration
export { 
  openai,
  gptCall,
  createDallEPrompt,
  createDallEImage
} from './bedrock';

// The rest of the implementation has been moved to bedrock.ts
// This file is now just a thin compatibility layer to avoid breaking imports