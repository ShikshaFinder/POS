import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reset payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } }),
    ]);

    return NextResponse.json(
      { message: "Password updated. You can sign in with the new password." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return NextResponse.json(
      { error: "Unable to reset password right now" },
      { status: 500 }
    );
  }
}

