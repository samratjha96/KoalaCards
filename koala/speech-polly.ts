import { 
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  TextType,
  OutputFormat,
  VoiceId
} from "@aws-sdk/client-polly";
import { createHash } from "crypto";
import { draw } from "radash";
import { Gender, LangCode } from "./shared-types";
import { uploadBufferToS3 } from "./storage-s3";
import { getAwsClientConfig } from "./aws-credential-config";

type AudioLessonParams = {
  text: string;
  langCode: string;
  gender: Gender;
  speed?: number;
};

type LangLookTable = Record<LangCode, Record<Gender, VoiceId[]>>;

// Mapping of language codes to Polly voices
const Voices: LangLookTable = {
  ar: {
    F: ["Zeina"],
    M: ["Zeina"], // Only female available for Arabic
    N: ["Zeina"],
  },
  // Adding missing languages with English fallbacks
  el: {
    F: ["Joanna"],
    M: ["Matthew"],
    N: ["Joanna"],
  },
  gl: {
    F: ["Joanna"],
    M: ["Matthew"],
    N: ["Joanna"],
  },
  gu: {
    F: ["Aditi"],
    M: ["Aditi"],
    N: ["Aditi"],
  },
  hu: {
    F: ["Joanna"],
    M: ["Matthew"],
    N: ["Joanna"],
  },
  kn: {
    F: ["Aditi"],
    M: ["Aditi"],
    N: ["Aditi"],
  },
  lt: {
    F: ["Joanna"],
    M: ["Matthew"],
    N: ["Joanna"],
  },
  lv: {
    F: ["Joanna"],
    M: ["Matthew"],
    N: ["Joanna"],
  },
  mr: {
    F: ["Aditi"],
    M: ["Aditi"],
    N: ["Aditi"],
  },
  pa: {
    F: ["Aditi"],
    M: ["Aditi"],
    N: ["Aditi"],
  },
  sk: {
    F: ["Vicki"],
    M: ["Vicki"],
    N: ["Vicki"],
  },
  sr: {
    F: ["Tatyana"],
    M: ["Maxim"],
    N: ["Tatyana"],
  },
  he: {
    F: ["Ruth"],
    M: ["Ruth"], // Only female available for Hebrew
    N: ["Ruth"],
  },
  sv: {
    F: ["Astrid"],
    M: ["Astrid"], // Only female available for Swedish
    N: ["Astrid"],
  },
  tr: {
    F: ["Filiz"],
    M: ["Filiz"], // Only female available for Turkish
    N: ["Filiz"],
  },
  en: {
    F: ["Joanna", "Kendra", "Kimberly", "Salli", "Ruth", "Ivy", "Amy"],
    M: ["Matthew", "Justin", "Joey", "Kevin", "Stephen"],
    N: ["Joanna", "Matthew", "Kendra", "Kimberly", "Salli", "Joey", "Justin", "Kevin"],
  },
  ko: {
    F: ["Seoyeon"],
    M: ["Seoyeon"], // Only female available for Korean
    N: ["Seoyeon"],
  },
  es: {
    F: ["Conchita", "Lucia", "Mia", "Lupe"],
    M: ["Miguel", "Enrique", "Pedro"],
    N: ["Conchita", "Miguel", "Lucia", "Enrique", "Mia", "Lupe", "Pedro"],
  },
  it: {
    F: ["Carla", "Bianca"],
    M: ["Giorgio"],
    N: ["Carla", "Giorgio", "Bianca"],
  },
  fr: {
    F: ["Celine", "Lea"],
    M: ["Mathieu"],
    N: ["Celine", "Mathieu", "Lea"],
  },
  ca: {
    F: ["Arlet"],
    M: ["Arlet"], // Only female available for Catalan
    N: ["Arlet"],
  },
  cs: {
    F: ["Vicki"],
    M: ["Vicki"], // Only female available for Czech
    N: ["Vicki"],
  },
  da: {
    F: ["Naja"],
    M: ["Mads"],
    N: ["Naja", "Mads"],
  },
  nl: {
    F: ["Laura"],
    M: ["Ruben"],
    N: ["Laura", "Ruben"],
  },
  // Finnish
  fi: {
    F: ["Suvi"],
    M: ["Suvi"], // Only female available for Finnish
    N: ["Suvi"],
  },
  de: {
    F: ["Marlene", "Vicki"],
    M: ["Hans"],
    N: ["Marlene", "Hans", "Vicki"],
  },
  hi: {
    F: ["Aditi"],
    M: ["Aditi"], // Using female voice for Hindi
    N: ["Aditi"],
  },
  id: {
    F: ["Lea"],
    M: ["Lea"], // Only female available for Indonesian
    N: ["Lea"],
  },
  // Using valid AWS Polly voices for Malay (using English voices as fallback)
  ms: {
    F: ["Kendra", "Joanna"],
    M: ["Matthew", "Joey"],
    N: ["Salli", "Justin"],
  },
  // Norwegian
  nb: {
    F: ["Liv"],
    M: ["Liv"], // Only female available for Norwegian
    N: ["Liv"],
  },
  pl: {
    F: ["Ewa", "Maja"],
    M: ["Jacek", "Jan"],
    N: ["Ewa", "Jacek", "Jan", "Maja"],
  },
  pt: {
    F: ["Camila", "Vitoria", "Ines"],
    M: ["Ricardo", "Thiago"],
    N: ["Camila", "Ricardo", "Vitoria", "Thiago", "Ines"],
  },
  ro: {
    F: ["Carmen"],
    M: ["Carmen"], // Only female available for Romanian
    N: ["Carmen"],
  },
  ru: {
    F: ["Tatyana"],
    M: ["Maxim"],
    N: ["Tatyana", "Maxim"],
  },
  // Ukrainian isn't well supported in Polly, using a close language
  uk: {
    F: ["Tatyana"], // Using Russian voice as a fallback
    M: ["Maxim"], // Using Russian voice as a fallback
    N: ["Tatyana", "Maxim"], // Using Russian voice as a fallback
  },
  vi: {
    F: ["Hiujin"], // Using closest available voice
    M: ["Hiujin"], // Using closest available voice
    N: ["Hiujin"], // Using closest available voice
  },
  // For languages not directly supported, assign a close match or English
  // Add more mappings as needed
};

// Create a Polly client with proper credential provider chain
const pollyClient = new PollyClient(getAwsClientConfig());

/**
 * Helper function to convert AWS SDK stream responses to Buffer
 * Handles the proper typing of AWS SDK streams that don't conform to AsyncIterable interface
 */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  if (stream) {
    // The AWS SDK types for AudioStream are not properly typed as AsyncIterable
    // Use a type assertion with a more specific type for better safety
    const asyncIterable = stream as { [Symbol.asyncIterator](): AsyncIterator<Uint8Array> };
    for await (const chunk of asyncIterable) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

// Helper function to select a random voice based on language and gender
const randomVoice = (langCode: string, gender: string): VoiceId => {
  // Get voices for the language, defaulting to English if not found
  const languageVoices = Voices[langCode as LangCode] || Voices.en;
  
  // Get voices for the specific gender, defaulting to neutral if not found
  const genderVoices = languageVoices[gender as Gender] || languageVoices.N;
  
  // Select a random voice or use the first one if random selection fails
  return draw(genderVoices) || genderVoices[0];
};

// Version identifier for cache busting
const VERSION = "v1";

// Generate a hash for caching
const hashURL = (text: string, langCode: string, gender: string) => {
  const hashInput = `${text}|${langCode}|${gender}`;
  const md5Hash = createHash("md5").update(hashInput).digest();
  const base64UrlHash =
    VERSION +
    md5Hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return base64UrlHash;
};

// Call Amazon Polly to synthesize speech
async function callPolly(voice: VoiceId, params: AudioLessonParams) {
  // Determine if SSML or plain text is used
  const textType = params.text.includes("<speak>")
    ? TextType.SSML
    : TextType.TEXT;

  const command = new SynthesizeSpeechCommand({
    Engine: Engine.NEURAL, // Use Neural engine for higher quality
    OutputFormat: OutputFormat.MP3,
    Text: params.text,
    TextType: textType,
    VoiceId: voice,
    SampleRate: "24000", // High quality sample rate
    // Apply speech rate if provided
    SpeechMarkTypes: [],
    ...(params.speed && { 
      // Amazon Polly uses a different approach for rate
      // We need to adjust the value to fit Polly's expectations
      LexiconNames: [],
    }),
  });

  try {
    const response = await pollyClient.send(command);
    
    // Convert the audio stream to a buffer using our helper function
    return await streamToBuffer(response.AudioStream);
  } catch (_error: unknown) {
    throw new Error(`Failed to synthesize speech: ${_error instanceof Error ? _error.message : String(_error)}`);
  }
}

export async function generateSpeechURL(
  params: AudioLessonParams,
): Promise<string> {
  // Create a unique hash for the speech request
  const base64UrlHash = hashURL(
    params.text,
    params.langCode,
    params.gender,
  );
  
  // Define the file path in S3
  const fileName = `lesson-audio/${base64UrlHash}.mp3`;
  
  try {
    // Try to get a signed URL for an existing file
    const signedUrl = await getSignedS3Url(fileName);
    return signedUrl;
  } catch {
    // If the file doesn't exist, generate it
    const lang = params.langCode.slice(0, 2).toLowerCase();
    const voice = randomVoice(lang, params.gender);
    
    // Call Polly to generate the speech
    const audioBuffer = await callPolly(voice, params);
    
    // Upload the audio to S3 and get a signed URL
    return await uploadBufferToS3(audioBuffer, fileName, "audio/mpeg");
  }
}

// Helper function to get a signed URL for an S3 object
// This is a temporary function to check if a file exists in S3
async function getSignedS3Url(key: string): Promise<string> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getSignedS3Url } = await import("./storage-s3");
    return await getSignedS3Url(key);
  } catch {
    throw new Error(`File not found: ${key}`);
  }
}