/**
 * AWS S3 implementation for storage needs
 */
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { createHash } from "crypto";
import { errorReport } from "./error-report";
import { s3Config } from "./aws-config";
import { getAwsClientConfig } from "./aws-credential-config";

// Create S3 client with proper credential chain
const s3Client = new S3Client(getAwsClientConfig());

// Check for required environment variables
const bucketName = s3Config.bucketName;

if (!bucketName) {
  errorReport("Missing ENV Var: AWS_S3_BUCKET_NAME");
}

// Removed explicit credential checks 
// AWS SDK's default credential provider chain will handle this automatically

// Define a File-like interface for backward compatibility
interface File {
  key: string;
  exists: () => Promise<[boolean]>;
  getSignedUrl: (options: Record<string, unknown>) => Promise<[string]>;
  save: (data: Buffer, options: Record<string, unknown> | undefined) => Promise<void>;
  cloudStorageURI: Record<string, unknown>;
  createWriteStream: () => Record<string, unknown>;
}

// Mock bucket object with similar methods to Google Cloud Storage but using S3 internally
export const bucket = {
  file: (fileName: string): File => {
    return {
      key: fileName,
      exists: async (): Promise<[boolean]> => {
        try {
          await s3Client.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: fileName,
            })
          );
          return [true];
        } catch {
          return [false];
        }
      },
      getSignedUrl: async (_options: Record<string, unknown>): Promise<[string]> => {
        const url = await getSignedS3Url(fileName);
        return [url];
      },
      save: async (data: Buffer, options: Record<string, unknown> | undefined): Promise<void> => {
        const contentType = options && 
          typeof options === 'object' && 
          options.metadata && 
          typeof options.metadata === 'object' && 
          'contentType' in options.metadata ? 
          String(options.metadata.contentType) : 'application/octet-stream';

        await uploadBufferToS3(
          data,
          fileName,
          contentType
        );
      },
      cloudStorageURI: {},
      createWriteStream: () => {
        // This is a stub for backward compatibility
        const chunks: Buffer[] = [];
        let resolve: (value: unknown) => void;
        let reject: (reason?: Error) => void;
        
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        
        return {
          on: (event: string, callback: (error?: Error) => void) => {
            if (event === 'finish') {
              // When the stream finishes, upload the concatenated buffer to S3
              promise.then(() => {
                uploadBufferToS3(Buffer.concat(chunks), fileName)
                  .then(() => callback())
                  .catch((error) => callback(error instanceof Error ? error : new Error(String(error))));
              });
            }
            if (event === 'error') {
              promise.catch(callback);
            }
          },
          write: (chunk: Buffer) => {
            chunks.push(chunk);
            return true;
          },
          end: () => {
            resolve(null);
          },
          emit: (event: string, data?: Error) => {
            if (event === 'error') {
              reject(data);
            }
          }
        };
      }
    };
  }
};

// Generate a signed URL for S3 object
export async function getSignedS3Url(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: s3Config.urlExpiration,
    });
    return url;
  } catch (error) {
    return errorReport(`Failed to generate signed URL for ${key}: ${error}`);
  }
}

/**
 * Uploads a file from a URL to Amazon S3.
 * @param url The URL of the file to download.
 * @param destination The destination path in the bucket.
 */
export async function storeUrlToS3(
  url: string,
  destination: string,
): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return errorReport(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: destination,
        Body: Buffer.from(buffer),
        ContentType: response.headers.get("content-type") || "application/octet-stream",
      },
    });

    await upload.done();
    return getSignedS3Url(destination);
  } catch (error) {
    return errorReport(`Failed to upload to S3: ${error}`);
  }
}

/**
 * Uploads a buffer to Amazon S3.
 * @param buffer The buffer to upload.
 * @param destination The destination path in the bucket.
 * @param contentType The content type of the file.
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  destination: string,
  contentType: string = "application/octet-stream",
): Promise<string> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: destination,
        Body: buffer,
        ContentType: contentType,
      },
    });

    await upload.done();
    return getSignedS3Url(destination);
  } catch (error) {
    return errorReport(`Failed to upload buffer to S3: ${error}`);
  }
}

// Legacy function for backward compatibility
export async function expiringUrl(blob: File): Promise<string> {
  return await getSignedS3Url(blob.key);
}

// Legacy function for backward compatibility
export async function storeURLGoogleCloud(url: string, destination: string): Promise<string> {
  return await storeUrlToS3(url, destination);
}

/** Creates a hex MD5 checksum with file extension
 * Example: cards/0b1d578f7d3b0e8d7e9e6d5f3e0f4f3a.jpg
 */
export const createBlobID = (
  kind: string,
  content: string,
  ext: string,
): string => {
  const hash = createHash("md5").update(content).digest("base64url");
  return `${kind}/${hash}.${ext}`;
};