/**
 * Speech generation using Amazon Polly
 */
import { Card } from "@prisma/client";
import { template } from "radash";
import { Gender, LessonType } from "./shared-types";
import { removeParens } from "./quiz-evaluators/evaluator-utils";
import { generateSpeechURL } from "./generate-speech-url";

// Parameters for audio lesson generation
type AudioLessonParams = {
  card: Pick<Card, "term" | "definition" | "gender" | "langCode">;
  lessonType: LessonType | "new";
  speed?: number;
};

// SSML templates for different lesson types
const DICTATION = `<speak><prosody rate="{{speed}}%">{{term}}</prosody><break time="0.4s"/><voice language="en-US" gender="female">{{definition}}</voice><break time="0.4s"/></speak>`;
const SSML: Record<LessonType, string> = {
  speaking: `<speak><voice language="en-US" gender="female">{{definition}}</voice></speak>`,
  listening: `<speak><prosody rate="{{speed}}%">{{term}}</prosody></speak>`,
  new: DICTATION,
  remedial: DICTATION,
};

/**
 * Generates audio for a lesson using Amazon Polly
 * @param params The parameters for audio generation
 * @returns A signed URL to the generated audio file
 */
export async function generateLessonAudio(params: AudioLessonParams): Promise<string> {
  // Create SSML template based on lesson type
  const ssml = template(SSML[params.lessonType], {
    term: removeParens(params.card.term),
    definition: removeParens(params.card.definition),
    speed: params.speed || 100,
  });
  
  // Generate speech using Amazon Polly and get the signed URL
  return await generateSpeechURL({
    text: ssml,
    gender: params.card.gender as Gender,
    langCode: params.card.langCode,
    speed: params.speed,
  });
}