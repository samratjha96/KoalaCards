import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"; // PutObjectCommand is not used directly
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { createHash } from "crypto";
import fetch from "node-fetch";
import { errorReport } from "./error-report";
import { s3Config } from "./aws-config";
import { getAwsClientConfig } from "./aws-credential-config";

// Create S3 client with proper credential provider chain
const s3Client = new S3Client(getAwsClientConfig());

// Generate a signed URL for S3 object
export async function getSignedS3Url(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: s3Config.bucketName,
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
        Bucket: s3Config.bucketName,
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
        Bucket: s3Config.bucketName,
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

/** Creates a hex MD5 checksum with file extension
 * Example: cards/0b1d578f7d3b0e8d7e9e6d5f3e0f4f3a.jpg
 */
export const createBlobID = (
  kind: string,
  content: string,
  ext: string,
) => {
  const hash = createHash("md5").update(content).digest("base64url");
  return `${kind}/${hash}.${ext}`;
};