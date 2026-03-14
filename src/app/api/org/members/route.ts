import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.currentOrganizationId) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.organizationMembership.findMany({
      where: {
        organizationId: user.currentOrganizationId,
        status: "ACTIVE",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.profile?.fullName || m.user.email,
        email: m.user.email,
        phone: m.user.profile?.phone || null,
        role: m.role,
        status: m.status,
        profileImage: m.user.profile?.profilePictureUrl || null,
        joinedAt: m.approvedAt?.toISOString() || m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[org/members GET]", error);
    return NextResponse.json(
      { error: "Unable to fetch members" },
      { status: 500 }
    );
  }
}

const updateMemberSchema = z.object({
  memberId: z.string(),
  status: z.string().optional(),
  role: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { memberId, status, role } = parsed.data;

    const targetMembership = await prisma.organizationMembership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Verify requester is owner/admin of the same org
    const myMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: targetMembership.organizationId,
        },
      },
    });

    if (!myMembership || !["OWNER", "ADMIN"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't modify the owner
    if (targetMembership.role === "OWNER" && user.id !== targetMembership.userId) {
      return NextResponse.json(
        { error: "Cannot modify the organization owner" },
        { status: 403 }
      );
    }

    await prisma.organizationMembership.update({
      where: { id: memberId },
      data: {
        ...(status && { status }),
        ...(role && { role }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[org/members PATCH]", error);
    return NextResponse.json(
      { error: "Unable to update member" },
      { status: 500 }
    );
  }
}

const deleteMemberSchema = z.object({
  memberId: z.string(),
});

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = deleteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }

    const { memberId } = parsed.data;

    const targetMembership = await prisma.organizationMembership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Can't remove the owner
    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the organization owner" },
        { status: 403 }
      );
    }

    // Verify requester is owner/admin of the same org
    const myMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: targetMembership.organizationId,
        },
      },
    });

    if (!myMembership || !["OWNER", "ADMIN"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.organizationMembership.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[org/members DELETE]", error);
    return NextResponse.json(
      { error: "Unable to remove member" },
      { status: 500 }
    );
  }
}
