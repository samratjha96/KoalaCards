// This is a replacement for the original image.ts file using AWS services
import { createImagePrompt, createBedrockImage } from "./aws-services";
import { prismaClient } from "./prisma-client";
import { getSignedS3Url, createBlobID, storeUrlToS3 } from "./aws-services";

// fetcher will just show images if present.
type Card = {
  id: number;
  term: string;
  userId: string;
  definition: string;
  imageBlobId: string | null;
};

export async function maybeGetCardImageUrl(
  blobID: string | null,
): Promise<string | undefined> {
  if (!blobID) {
    return;
  }

  return await getSignedS3Url(blobID);
}

const CHEAPNESS = 1; // % of cards that will get an image.

export async function maybeAddImageToCard(card: Card) {
  if (card.imageBlobId) {
    return;
  }

  const cardCount = await prismaClient.card.count({
    where: {
      userId: card.userId,
      imageBlobId: { not: null },
    },
  });

  const cheap = Math.random() < CHEAPNESS / 100;
  const skip = cardCount < 50 ? false : cheap;

  if (skip) {
    return;
  }

  const prompt = await createImagePrompt(card.term, card.definition);
  const url = await createBedrockImage(prompt);
  const filePath = createBlobID("card-images", card.term, "jpg");
  await storeUrlToS3(url, filePath);
  await prismaClient.card.update({
    where: { id: card.id },
    data: { imageBlobId: filePath },
  });

  return await maybeGetCardImageUrl(filePath);
}