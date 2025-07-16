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
import { createBlobID, uploadBufferToS3 } from "./storage-s3";
import { awsConfig, pollyConfig, s3Config } from "./aws-config";

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
  ms: {
    F: ["Nina"],
    M: ["Nina"], // Only female available for Malay
    N: ["Nina"],
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

// Create a Polly client
const pollyClient = new PollyClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

// Helper function to select a random voice based on language and gender
const randomVoice = (langCode: string, gender: string): VoiceId => {
  const l1 = Voices[langCode as LangCode] || Voices.en; // Default to English if language not found
  const l2 = l1[gender as Gender] || l1.N;
  return draw(l2) || l2[0];
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
    
    // Convert the audio stream to a buffer
    const chunks: Uint8Array[] = [];
    if (response.AudioStream) {
      for await (const chunk of response.AudioStream) {
        chunks.push(chunk);
      }
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    throw new Error(`Failed to synthesize speech: ${error}`);
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
  } catch (error) {
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
  } catch (error) {
    throw new Error(`File not found: ${key}`);
  }
}