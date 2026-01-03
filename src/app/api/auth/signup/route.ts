import bcrypt from "bcryptjs";
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

const nameField = z
  .union([z.string().trim().min(2).max(60), z.literal("")])
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  });

const signupSchema = z.object({
  name: nameField,
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid signup data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const name = parsed.data.name ?? null;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        ...(name && {
          profile: {
            create: {
              fullName: name,
            }
          }
        })
      },
    });

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
      {
        message:
          "Account created. Please verify your email using the link we just sent.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { error: "Unable to create account right now" },
      { status: 500 }
    );
  }
}

