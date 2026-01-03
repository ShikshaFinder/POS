import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const verifySchema = z.object({
  token: z.string().min(10),
});

async function handleVerification(token: string | null) {
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Verification link is invalid or expired." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } }),
  ]);

  return NextResponse.json(
    { message: "Email verified successfully. You can now sign in." },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  return handleVerification(token);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid token", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return handleVerification(parsed.data.token);
}

