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
      return NextResponse.json({ requests: [] });
    }

    // Only org owners/admins can view join requests
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.currentOrganizationId,
        },
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only org owners/admins can view join requests" },
        { status: 403 }
      );
    }

    const requests = await prisma.organizationMembership.findMany({
      where: {
        organizationId: user.currentOrganizationId,
        status: "PENDING",
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.user.profile?.fullName || r.user.email,
        email: r.user.email,
        phone: r.user.profile?.phone || null,
        status: r.status,
        requestedRole: r.requestedRole,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[org/join-requests GET]", error);
    return NextResponse.json(
      { error: "Unable to fetch join requests" },
      { status: 500 }
    );
  }
}

const actionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["APPROVE", "DENY"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { requestId, action } = parsed.data;

    const request = await prisma.organizationMembership.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Join request not found or already processed" },
        { status: 404 }
      );
    }

    // Verify requester is owner/admin of the same org
    const myMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: request.organizationId,
        },
      },
    });

    if (!myMembership || !["OWNER", "ADMIN"].includes(myMembership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "APPROVE") {
      await prisma.organizationMembership.update({
        where: { id: requestId },
        data: {
          status: "ACTIVE",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      // Set as default org if user doesn't have one
      const targetUser = await prisma.user.findUnique({
        where: { id: request.userId },
      });
      if (!targetUser?.defaultOrganizationId) {
        await prisma.user.update({
          where: { id: request.userId },
          data: { defaultOrganizationId: request.organizationId },
        });
      }
    } else {
      await prisma.organizationMembership.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: "Denied by organization admin",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[org/join-requests PATCH]", error);
    return NextResponse.json(
      { error: "Unable to process join request" },
      { status: 500 }
    );
  }
}
