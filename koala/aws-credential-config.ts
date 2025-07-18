/**
 * AWS Credential Provider Configuration
 * 
 * This file configures AWS credentials with proper fallback behavior:
 * 1. Use ~/.aws credentials if available (mounted from host)
 * 2. Use instance metadata/profiles if running on EC2
 * 3. Use environment variables as a last resort
 */
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

// Re-export AWS region configuration
export const AWS_REGION = process.env.AWS_REGION || "us-east-1";

/**
 * Creates a credential provider that properly follows the AWS SDK credential provider chain
 * with improved EC2 metadata handling
 */
export function getCredentialProvider(): AwsCredentialIdentityProvider {
  // Use the Node.js provider chain which checks in this order:
  // 1. Environment variables
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. Shared config file (~/.aws/config)
  // 4. Web Identity Token credentials
  // 5. ECS credentials
  // 6. EC2 Instance Metadata credentials
  return fromNodeProviderChain({
    // Short timeout for EC2 metadata to avoid slow startup when not on EC2
    // This is the timeout in milliseconds for the EC2 metadata service
    timeout: 1000,
    // Maximum retries for EC2 metadata service
    maxRetries: 1,
  });
}

/**
 * Creates AWS client configuration with proper credential handling
 */
export function getAwsClientConfig() {
  return {
    region: AWS_REGION,
    credentials: getCredentialProvider(),
  };
}

// Bedrock Configuration
export const bedrockConfig = {
  region: AWS_REGION,
  textModelId: process.env.BEDROCK_TEXT_MODEL_ID || "anthropic.claude-3-5-sonnet-20240620-v1:0",
  imageModelId: process.env.BEDROCK_IMAGE_MODEL_ID || "stability.stable-diffusion-xl-v1",
};

// S3 Configuration
export const s3Config = {
  region: AWS_REGION,
  bucketName: process.env.AWS_S3_BUCKET_NAME || "",
  urlExpiration: 3600, // URL expiration in seconds (1 hour)
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
    // Language code mappings (same as in aws-config.ts)
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