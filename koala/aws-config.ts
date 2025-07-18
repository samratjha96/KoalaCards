/**
 * AWS Configuration
 */
// AWS Configuration Module

// AWS Environment Variables
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Bedrock Model IDs
const BEDROCK_TEXT_MODEL_ID = process.env.BEDROCK_TEXT_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0";
const BEDROCK_IMAGE_MODEL_ID = process.env.BEDROCK_IMAGE_MODEL_ID || "stability.stable-diffusion-xl-v1";

// AWS configuration object
export const awsConfig = {
  region: AWS_REGION,
  // Removed explicit credentials to use AWS SDK default credential provider chain
  // This will automatically pick up credentials from environment variables,
  // shared credentials file, or EC2/ECS instance roles
};

// S3 Configuration
export const s3Config = {
  region: AWS_REGION,
  bucketName: AWS_S3_BUCKET_NAME || "",
  urlExpiration: 3600, // URL expiration in seconds (1 hour)
};

// Bedrock Configuration
export const bedrockConfig = {
  region: AWS_REGION,
  textModelId: BEDROCK_TEXT_MODEL_ID,
  imageModelId: BEDROCK_IMAGE_MODEL_ID,
};

// Amazon Polly Configuration
export const pollyConfig = {
  region: AWS_REGION,
  outputFormat: "mp3",
  voiceEngine: "neural", // Use Neural voices for highest quality
};

// Amazon Transcribe Configuration
export const transcribeConfig = {
  region: AWS_REGION,
  outputFormat: "json",
  languageCodeMap: {
    en: "en-US",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    ja: "ja-JP",
    ko: "ko-KR",
    pt: "pt-BR",
    zh: "zh-CN",
    ar: "ar-SA",
    he: "he-IL",
    hi: "hi-IN",
    id: "id-ID",
    nl: "nl-NL",
    pl: "pl-PL",
    ru: "ru-RU",
    sv: "sv-SE",
    tr: "tr-TR",
    // Add more language codes as needed
  },
};