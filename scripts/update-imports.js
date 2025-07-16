const fs = require('fs');
const path = require('path');

// Define the import replacements
const replacements = [
  { 
    from: "import OpenAI from \"openai\";", 
    to: "// AWS Bedrock implementation replaces OpenAI\nimport { bedrockCall, createImagePrompt, createBedrockImage } from './aws-services';" 
  },
  { 
    from: "import { ChatCompletionCreateParamsNonStreaming } from \"openai/resources\";", 
    to: "// AWS Bedrock implementation uses different types" 
  },
  {
    from: "import { openai } from \"./openai\";",
    to: "import { openai } from \"./openai-aws\";"
  },
  {
    from: "import { generateSpeechURL } from \"./generate-speech-url\";",
    to: "import { generateSpeechURL } from \"./speech-polly\";"
  },
  {
    from: "import { transcribeB64 } from \"./transcribe\";",
    to: "import { transcribeB64 } from \"./transcribe-aws\";"
  },
  {
    from: "import { bucket, createBlobID, expiringUrl, storeURLGoogleCloud } from \"./storage\";",
    to: "import { getSignedS3Url as expiringUrl, createBlobID, storeUrlToS3 as storeURLGoogleCloud } from \"./storage-s3\";"
  },
  {
    from: "import { grammarCorrectionNext } from \"../grammar\";",
    to: "import { grammarCorrectionNext } from \"../grammar-aws\";"
  },
  {
    from: "import { File, Storage } from \"@google-cloud/storage\";",
    to: "// AWS S3 implementation replaces Google Cloud Storage"
  },
  {
    from: "import textToSpeech, { TextToSpeechClient, protos } from \"@google-cloud/text-to-speech\";",
    to: "// Amazon Polly implementation replaces Google Cloud TTS"
  }
];

// Function to replace imports in a file
function updateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(from, to);
        hasChanges = true;
        console.log(`Updated import in ${filePath}`);
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Function to process all files in a directory
function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next') {
        processDirectory(fullPath);
      }
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      updateImports(fullPath);
    }
  });
}

// Start processing from the root directory
processDirectory(path.resolve(__dirname, '..'));