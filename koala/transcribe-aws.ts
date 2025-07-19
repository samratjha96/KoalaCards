import { 
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJobStatus
} from "@aws-sdk/client-transcribe";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// createReadStream is not used, import removed
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { uid, unique } from "radash";
import { LangCode } from "./shared-types";
import { awsConfig, transcribeConfig, s3Config } from "./aws-config";

type TranscriptionResult =
  | { kind: "OK"; text: string }
  | { kind: "error" };

// Create clients
const transcribeClient = new TranscribeClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

// Map language codes to AWS Transcribe language codes
function getTranscribeLanguageCode(language: LangCode): string {
  return transcribeConfig.languageCodeMap[language] || "en-US";
}

// Helper function to wait for a transcription job to complete
async function waitForTranscriptionJobComplete(jobName: string, maxWaitTimeMs: number = 60000): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName
    });
    
    const response = await transcribeClient.send(command);
    const status = response.TranscriptionJob?.TranscriptionJobStatus;
    
    if (status === TranscriptionJobStatus.COMPLETED) {
      // Parse the transcript URL and extract the text
      const transcriptUrl = response.TranscriptionJob?.Transcript?.TranscriptFileUri;
      if (transcriptUrl) {
        const transcriptResponse = await fetch(transcriptUrl);
        const transcriptData = await transcriptResponse.json();
        return transcriptData.results.transcripts[0].transcript;
      }
      return "";
    }
    
    if (status === TranscriptionJobStatus.FAILED) {
      throw new Error(`Transcription failed: ${response.TranscriptionJob?.FailureReason}`);
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error("Transcription timeout");
}

export async function transcribeB64(
  dataURI: string,
  _userID: string | number,
  prompt: string,
  language: LangCode,
): Promise<TranscriptionResult> {
  // Extract the base64 data from the URI
  const buffer = Buffer.from(
    dataURI.split(";base64,").pop() ?? "",
    "base64",
  );
  
  // Create a unique ID for this transcription job
  const uniqueId = uid(8);
  const fpath = path.join("/tmp", `${uniqueId}.wav`);
  const jobName = `transcription-${uniqueId}`;
  const s3Key = `transcriptions/${uniqueId}.wav`;
  
  try {
    // Write the buffer to a temporary file
    await writeFile(fpath, buffer);
    
    // Extract keywords from the prompt for context - not used currently
    // Kept for future implementations of custom vocabularies
    const _promptWords = unique(
      prompt
        .split(/\s+|[.,!?;:()]/)
        .filter(Boolean)
        .sort(),
    ).join(" ");
    
    // Upload the audio file to S3
    const fileContent = await readFile(fpath);
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: "audio/wav",
      })
    );
    
    // Start transcription job
    const transcribeCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: {
        MediaFileUri: `s3://${s3Config.bucketName}/${s3Key}`
      },
      LanguageCode: getTranscribeLanguageCode(language),
      MediaFormat: "wav",
      Settings: {
        ShowSpeakerLabels: false,
        MaxSpeakerLabels: 1,
        // Optional vocabulary settings to improve accuracy with domain-specific terms
        VocabularyName: undefined, // Can use custom vocabulary if created in AWS
      }
    });
    
    await transcribeClient.send(transcribeCommand);
    
    // Wait for the job to complete and get the transcript
    const transcriptText = await waitForTranscriptionJobComplete(jobName);
    
    // Return the first line of the transcript (similar to original implementation)
    return { kind: "OK", text: transcriptText.split("\n")[0] };
    
  } catch (error) {
    console.error(`Transcription Error: ${JSON.stringify(error)}`);
    return { kind: "error" };
  } finally {
    // Clean up the temporary file
    try {
      await unlink(fpath);
    } catch (e) {
      console.error(`Delete Error: ${JSON.stringify(e)}`);
    }
  }
}