import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  addMinutesToNow,
  defaultExpiryMinutes,
  generateToken,
  hashToken,
} from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { message: "If that email is registered, a reset link is on the way." },
        { status: 200 }
      );
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken();
    const tokenHash = hashToken(token);

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: addMinutesToNow(defaultExpiryMinutes.passwordReset),
      },
    });

    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json(
      { message: "If that email is registered, a reset link is on the way." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return NextResponse.json(
      { error: "Unable to process request right now" },
      { status: 500 }
    );
  }
}

