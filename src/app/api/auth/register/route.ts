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

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  shopName: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  // Org creation
  orgName: z.string().optional(),
  orgCode: z.string().optional(),
  createOrg: z.boolean().optional(),
  // Org joining
  joinOrgCode: z.string().optional(),
  joinOrgName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      email: rawEmail,
      phone,
      shopName,
      address,
      gstNumber,
      orgName,
      orgCode,
      createOrg,
      joinOrgCode,
    } = parsed.data;

    const email = rawEmail.toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If user exists but is not verified, allow re-registration
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      // Update existing unverified user
      await prisma.userProfile.upsert({
        where: { userId: existing.id },
        create: {
          userId: existing.id,
          fullName: name,
          ...(phone && { phone }),
          ...(address && { address }),
        },
        update: {
          fullName: name,
          ...(phone && { phone }),
          ...(address !== undefined && { address }),
        },
      });

      // Resend verification
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: existing.id },
      });
      const token = generateToken();
      await prisma.emailVerificationToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: existing.id,
          expiresAt: addMinutesToNow(defaultExpiryMinutes.verification),
        },
      });
      await sendVerificationEmail(email, token);

      return NextResponse.json({
        message:
          "Verification email resent. Please check your inbox to verify your email.",
      });
    }

    // Create user (no password — set via create-password after verification)
    // Use a random placeholder password to satisfy the required field
    const placeholderHash = await bcrypt.hash(
      generateToken(16),
      12
    );

    const user = await prisma.user.create({
      data: {
        email,
        password: placeholderHash,
        profile: {
          create: {
            fullName: name,
            ...(phone && { phone }),
            ...(address && { address }),
          },
        },
      },
    });

    // Handle org creation
    if (createOrg && orgName) {
      const code =
        orgCode ||
        orgName
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 6)
          .toUpperCase() +
          Math.random().toString(36).substring(2, 4).toUpperCase();

      const org = await prisma.organization.create({
        data: {
          name: orgName,
          slug: orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          code,
          ownerId: user.id,
          ...(gstNumber && { gstNumber }),
          ...(address && { businessAddress: address }),
        },
      });

      await prisma.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { defaultOrganizationId: org.id },
      });
    }

    // Handle org join
    if (joinOrgCode) {
      const org = await prisma.organization.findUnique({
        where: { code: joinOrgCode },
      });
      if (org) {
        await prisma.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: "MEMBER",
            status: "PENDING",
          },
        });
      }
    }

    // Send verification email
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });
    const token = generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: addMinutesToNow(defaultExpiryMinutes.verification),
      },
    });
    await sendVerificationEmail(email, token);

    return NextResponse.json(
      {
        message:
          "Registration successful. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "Unable to register right now" },
      { status: 500 }
    );
  }
}
