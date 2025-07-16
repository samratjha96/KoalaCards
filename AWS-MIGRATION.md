# Migration to AWS Services

This document provides guidance on migrating KoalaCards from OpenAI and Google Cloud services to AWS services.

## Overview

The migration involves replacing the following services:

1. **OpenAI API** → **AWS Bedrock** (Claude models)
2. **Google Cloud Text-to-Speech** → **Amazon Polly**
3. **OpenAI Audio Transcription** → **Amazon Transcribe**
4. **Google Cloud Storage** → **Amazon S3**
5. **DALL-E Image Generation** → **AWS Bedrock Stable Diffusion**

## Prerequisites

1. An AWS account with access to the following services:
   - Amazon S3
   - Amazon Polly
   - Amazon Transcribe
   - AWS Bedrock (with access to Claude and Stable Diffusion models)

2. AWS credentials with appropriate permissions
   - Access Key ID
   - Secret Access Key

## Environment Variables

Update your `.env` file with the following AWS credentials:

```env
# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET_NAME="your-s3-bucket-name"

# AWS Bedrock Model IDs
BEDROCK_TEXT_MODEL_ID="anthropic.claude-3-5-sonnet-20240620-v1:0"
BEDROCK_IMAGE_MODEL_ID="stability.stable-diffusion-xl-v1"
```

## Manual Migration Steps

If you prefer to migrate manually instead of using the migration script:

1. **Update dependencies**:

```bash
npm uninstall @google-cloud/language @google-cloud/storage @google-cloud/text-to-speech openai
npm install @aws-sdk/client-s3 @aws-sdk/client-polly @aws-sdk/client-transcribe @aws-sdk/client-bedrock-runtime @aws-sdk/s3-request-presigner @aws-sdk/lib-storage
```

2. **Update imports** in your files to use the AWS implementations:

```typescript
// Replace these imports:
import { openai } from './openai';
import { generateSpeechURL } from './generate-speech-url';
import { transcribeB64 } from './transcribe';
import { bucket, createBlobID } from './storage';

// With these imports:
import { 
  bedrockCall, 
  generateSpeechURL, 
  transcribeB64, 
  getSignedS3Url, 
  createBlobID 
} from './aws-services';
```

3. **Run the build** to verify the changes:

```bash
npm run build
```

## Automated Migration

We've provided a migration script to automate most of the process:

```bash
npx tsx scripts/migrate-to-aws.ts
```

This script will:
1. Remove Google Cloud and OpenAI dependencies
2. Install AWS SDK dependencies
3. Update imports in TypeScript files
4. Run a build to verify the changes

## AWS Service Implementation Details

### AWS Bedrock for LLM

- Uses Claude models via AWS Bedrock for all LLM tasks
- Supports structured outputs with JSON schemas
- Provides compatibility layer with the OpenAI API interface

### Amazon Polly for TTS

- Uses Neural voices for high-quality speech synthesis
- Supports SSML for more control over speech generation
- Provides similar voice selection by gender and language

### Amazon Transcribe for STT

- Uses high-accuracy speech recognition
- Supports multiple languages
- Process audio files asynchronously

### Amazon S3 for Storage

- Stores lesson audio, user recordings, and images
- Generates pre-signed URLs for client access
- Uses similar hashing for file identifiers

### AWS Bedrock Stable Diffusion for Image Generation

- Generates images using Stable Diffusion models
- Creates prompts using Claude to maintain similarity with DALL-E workflow
- Uploads generated images to S3

## Verifying the Migration

After migration, verify the following functionality:

1. LLM-based grading of user responses
2. Text-to-speech generation for flashcards
3. Speech-to-text recognition for user voice input
4. Image generation for flashcards
5. Storage and retrieval of audio and image files