import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  profileImage: z.string().url().optional(),
  shopName: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId =
      req.nextUrl.searchParams.get("userId");

    // Try auth first, fallback to userId param
    const authUser = await authenticateRequest(req);
    const targetId = userId || authUser?.id;

    if (!targetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        profile: true,
        memberships: {
          include: { organization: true },
          where: { status: "ACTIVE" },
        },
        defaultOrganization: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const org =
      dbUser.defaultOrganization ||
      dbUser.memberships[0]?.organization ||
      null;

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.profile?.fullName || dbUser.email,
        phone: dbUser.profile?.phone || null,
        profileImage: dbUser.profile?.profilePictureUrl || null,
        shopName: org?.name || null,
        address: dbUser.profile?.address || org?.businessAddress || null,
        gstNumber: org?.gstNumber || null,
        paymentStatus: org?.isPaused ? "UNPAID" : "PAID",
        onboardingCompleted: org?.onboardingCompleted ?? false,
        orgRole: dbUser.memberships[0]?.role || null,
        orgCode: org?.code || null,
      },
    });
  } catch (error) {
    console.error("[auth/profile GET]", error);
    return NextResponse.json(
      { error: "Unable to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Try auth or use the userId from body
    const authUser = await authenticateRequest(req);
    const targetId = authUser?.id || parsed.data.userId;

    if (!targetId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, profileImage, shopName, address, gstNumber } =
      parsed.data;

    // Update user profile
    await prisma.userProfile.upsert({
      where: { userId: targetId },
      create: {
        userId: targetId,
        fullName: name || "User",
        ...(phone && { phone }),
        ...(profileImage && { profilePictureUrl: profileImage }),
        ...(address && { address }),
      },
      update: {
        ...(name && { fullName: name }),
        ...(phone !== undefined && { phone }),
        ...(profileImage && { profilePictureUrl: profileImage }),
        ...(address !== undefined && { address }),
      },
    });

    // Update org details if user is an owner
    if (shopName || gstNumber !== undefined) {
      const membership = await prisma.organizationMembership.findFirst({
        where: { userId: targetId, role: "OWNER", status: "ACTIVE" },
      });
      if (membership) {
        await prisma.organization.update({
          where: { id: membership.organizationId },
          data: {
            ...(shopName && { name: shopName }),
            ...(gstNumber !== undefined && { gstNumber }),
          },
        });
      }
    }

    // Fetch updated user
    const dbUser = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        profile: true,
        memberships: {
          include: { organization: true },
          where: { status: "ACTIVE" },
        },
        defaultOrganization: true,
      },
    });

    const org =
      dbUser?.defaultOrganization ||
      dbUser?.memberships[0]?.organization ||
      null;

    return NextResponse.json({
      user: {
        id: dbUser?.id,
        email: dbUser?.email,
        name: dbUser?.profile?.fullName || dbUser?.email,
        phone: dbUser?.profile?.phone || null,
        profileImage: dbUser?.profile?.profilePictureUrl || null,
        shopName: org?.name || null,
        address: dbUser?.profile?.address || org?.businessAddress || null,
        gstNumber: org?.gstNumber || null,
        paymentStatus: org?.isPaused ? "UNPAID" : "PAID",
        orgRole: dbUser?.memberships[0]?.role || null,
      },
    });
  } catch (error) {
    console.error("[auth/profile PATCH]", error);
    return NextResponse.json(
      { error: "Unable to update profile" },
      { status: 500 }
    );
  }
}
