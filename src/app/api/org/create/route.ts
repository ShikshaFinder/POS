import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

const createOrgSchema = z.object({
  orgName: z.string().min(1).max(100),
  shopName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orgName, shopName, phone, address, gstNumber } = parsed.data;

    // Check if user already owns an org
    const existingOwnership = await prisma.organizationMembership.findFirst({
      where: { userId: user.id, role: "OWNER", status: "ACTIVE" },
    });

    if (existingOwnership) {
      return NextResponse.json(
        { error: "You already own an organization" },
        { status: 409 }
      );
    }

    // Generate unique org code
    const code =
      orgName
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 6)
        .toUpperCase() +
      Math.random().toString(36).substring(2, 4).toUpperCase();

    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const org = await prisma.organization.create({
      data: {
        name: shopName || orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
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

    // Update phone in profile if provided
    if (phone) {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, fullName: user.name || "User", phone },
        update: { phone },
      });
    }

    return NextResponse.json({
      org: {
        id: org.id,
        orgCode: org.code,
        orgRole: "OWNER",
        createdAt: org.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[org/create]", error);
    return NextResponse.json(
      { error: "Unable to create organization" },
      { status: 500 }
    );
  }
}
