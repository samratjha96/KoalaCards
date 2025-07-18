/**
 * Image generation using AWS Bedrock Stable Diffusion
 */
import { 
  createImagePrompt, 
  createBedrockImage
} from "./bedrock";
import { prismaClient } from "./prisma-client";
import { 
  bucket,
  createBlobID,
  storeUrlToS3
} from "./storage";

// Type definitions for card data
type Card = {
  id: number;
  term: string;
  userId: string;
  definition: string;
  imageBlobId: string | null;
};

/**
 * Retrieves a signed URL for a card image
 */
export async function maybeGetCardImageUrl(
  blobID: string | null,
): Promise<string | undefined> {
  if (!blobID) {
    return;
  }

  // Get signed URL from the file in the bucket
  const file = bucket.file(blobID);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 3600 * 1000, // URL expires in 1 hour
  });
  return url;
}

// Percentage of cards that will get an image
const CHEAPNESS = 1; 

/**
 * Adds an image to a card by generating one using AWS Bedrock Stable Diffusion
 */
export async function maybeAddImageToCard(card: Card) {
  // Skip if card already has an image
  if (card.imageBlobId) {
    return;
  }

  // Count how many cards from this user already have images
  const cardCount = await prismaClient.card.count({
    where: {
      userId: card.userId,
      imageBlobId: { not: null },
    },
  });

  // Rate limiting logic - only generate images for a small percentage of cards
  const cheap = Math.random() < CHEAPNESS / 100;
  const skip = cardCount < 50 ? false : cheap;

  if (skip) {
    return;
  }

  // Generate a prompt for the image using Bedrock LLM
  const prompt = await createImagePrompt(card.term, card.definition);
  
  // Generate the image using Stable Diffusion
  const url = await createBedrockImage(prompt);
  
  // Create a unique ID for the image file
  const filePath = createBlobID("card-images", card.term, "jpg");
  
  // Store the generated image in S3
  await storeUrlToS3(url, filePath);
  
  // Update the card in the database with the image blob ID
  await prismaClient.card.update({
    where: { id: card.id },
    data: { imageBlobId: filePath },
  });

  // Return the signed URL for the image
  return await maybeGetCardImageUrl(filePath);
}