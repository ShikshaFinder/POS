import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const phoneLoginSchema = z.object({
  phone: z.string().min(4),
  pin: z.string().min(1),
});

function buildUserResponse(user: any, membership: any, org: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.profile?.fullName || user.email,
    phone: user.profile?.phone || null,
    role: membership?.role || "STAFF",
    lastLogin: user.lastLoginAt?.toISOString() || null,
    profileImage: user.profile?.profilePictureUrl || null,
    shopId: org?.id || null,
    shopName: org?.name || null,
    address: user.profile?.address || org?.businessAddress || null,
    gstNumber: org?.gstNumber || null,
    paymentStatus: org?.isPaused ? "UNPAID" : "PAID",
    onboardingCompleted: org?.onboardingCompleted ?? false,
    orgRole: membership?.role || null,
    orgCode: org?.code || null,
    status: user.isActive ? "ACTIVE" : "DISABLED",
    trialStartDate: org?.createdAt?.toISOString() || null,
    trialEndDate: null,
    pendingJoinOrgCode: null,
  };
}

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      profile: true,
      memberships: { include: { organization: true } },
      defaultOrganization: true,
    },
  });
}

async function findUserByPhone(phone: string) {
  const profile = await prisma.userProfile.findFirst({
    where: { phone },
    include: {
      user: {
        include: {
          profile: true,
          memberships: { include: { organization: true } },
          defaultOrganization: true,
        },
      },
    },
  });
  return profile?.user || null;
}

function resolveOrg(user: any) {
  const defaultOrg = user.defaultOrganization;
  const activeMembership = user.memberships.find(
    (m: any) => m.status === "ACTIVE"
  );

  if (defaultOrg) {
    const membership = user.memberships.find(
      (m: any) => m.organizationId === defaultOrg.id
    );
    return { org: defaultOrg, membership: membership || activeMembership };
  }

  if (activeMembership) {
    return { org: activeMembership.organization, membership: activeMembership };
  }

  return { org: null, membership: null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let user: any = null;
    let isPhoneLogin = false;

    // Try phone+pin login first
    const phoneParsed = phoneLoginSchema.safeParse(body);
    if (phoneParsed.success) {
      isPhoneLogin = true;
      user = await findUserByPhone(phoneParsed.data.phone);
      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Invalid phone number or PIN" },
          { status: 401 }
        );
      }
      const valid = await bcrypt.compare(phoneParsed.data.pin, user.password);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid phone number or PIN" },
          { status: 401 }
        );
      }
    }

    // Try email+password login
    const emailParsed = emailLoginSchema.safeParse(body);
    if (!isPhoneLogin && emailParsed.success) {
      user = await findUserByEmail(emailParsed.data.email);
      if (!user || !user.password) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      
      const valid = await bcrypt.compare(
        emailParsed.data.password,
        user.password
      );
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
    } else if (!isPhoneLogin) {
      return NextResponse.json(
          { error: "Please provide valid credentials." },
          { status: 400 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated" },
        { status: 403 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Check for pending join request
    const pendingMembership = user.memberships.find(
      (m: any) => m.status === "PENDING"
    );

    const { org, membership } = resolveOrg(user);

    // Build NextAuth-compatible JWT
    if (!process.env.NEXTAUTH_SECRET) {
      console.error("NEXTAUTH_SECRET is missing from environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration. Please contact support." },
        { status: 500 }
      );
    }

    const token = await encode({
      token: {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.profile?.fullName || user.email,
        currentOrganizationId: org?.id || null,
        organizationName: org?.name || null,
        role: membership?.role || "STAFF",
      },
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userResponse = buildUserResponse(user, membership, org);
    if (pendingMembership) {
      userResponse.pendingJoinOrgCode =
        pendingMembership.organization?.code || null;
    }

    return NextResponse.json({ user: userResponse, token });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Unable to log in right now", details: String(error) },
      { status: 500 }
    );
  }
}
