import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

import { authenticateRequest } from "@/lib/auth-mobile";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "product-images";

async function uploadBase64ToBlob(
  base64Data: string,
  blobPath: string,
): Promise<string> {
  if (!connectionString) {
    throw new Error("Azure Storage not configured");
  }
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 data URI");
  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");

  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  const container = blobService.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobPath);

  await blob.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blob.url;
}

/**
 * POST /api/pos/upload/category-image
 *
 * Accepts { categoryId, imageData (base64), skipDbUpdate? }
 * Returns { imageUrl }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId, imageData, skipDbUpdate } = await req.json();
    if (!imageData) {
      return NextResponse.json(
        { error: "imageData is required" },
        { status: 400 },
      );
    }

    const orgId = user.currentOrganizationId;
    const blobPath = `${orgId}/categories/${categoryId || Date.now()}-${Date.now()}.webp`;

    const imageUrl = await uploadBase64ToBlob(imageData, blobPath);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("[pos/upload/category-image POST]", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 },
    );
  }
}
