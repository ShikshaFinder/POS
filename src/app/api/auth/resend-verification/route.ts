import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  addMinutesToNow,
  defaultExpiryMinutes,
  generateToken,
  hashToken,
} from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

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
        { message: "If the account exists, a new link is on the way." },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "This account is already verified." },
        { status: 200 }
      );
    }

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    const token = generateToken();
    const tokenHash = hashToken(token);

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: addMinutesToNow(defaultExpiryMinutes.verification),
      },
    });

    await sendVerificationEmail(user.email, token);

    return NextResponse.json(
      { message: "Verification email resent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[auth/resend-verification]", error);
    return NextResponse.json(
      { error: "Unable to resend verification email right now" },
      { status: 500 }
    );
  }
}

