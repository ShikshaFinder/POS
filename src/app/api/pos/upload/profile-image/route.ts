import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";

/**
 * POST /api/pos/upload/profile-image
 *
 * Uploads a profile image. Accepts base64-encoded image data.
 * In production, this would upload to Azure Blob / R2 / S3.
 * For now, it accepts the data and returns the URL.
 */

const uploadSchema = z.object({
  userId: z.string(),
  imageData: z.string(), // data:image/jpeg;base64,...
  fileName: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req);
    // Allow both authenticated and userId-based uploads
    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid upload data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, imageData, fileName } = parsed.data;

    // Validate the user is uploading their own image
    if (authUser && authUser.id !== userId) {
      return NextResponse.json(
        { error: "Cannot upload image for another user" },
        { status: 403 }
      );
    }

    // In a full implementation, upload to Azure Blob Storage / Cloudflare R2
    // For now, we'll store the base64 data URL directly
    // TODO: Implement proper cloud storage upload
    const imageUrl = imageData.startsWith("data:")
      ? imageData // Keep as data URL for now
      : `data:image/jpeg;base64,${imageData}`;

    // Update user profile with image URL
    const { prisma } = await import("@/lib/prisma");
    await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, fullName: "User", profilePictureUrl: imageUrl },
      update: { profilePictureUrl: imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("[pos/upload/profile-image POST]", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
