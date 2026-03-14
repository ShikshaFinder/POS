import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: { organization: true },
          where: { status: { in: ["ACTIVE", "PENDING"] } },
        },
        defaultOrganization: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activeMembership = dbUser.memberships.find(
      (m) => m.status === "ACTIVE"
    );
    const pendingMembership = dbUser.memberships.find(
      (m) => m.status === "PENDING"
    );
    const org =
      dbUser.defaultOrganization || activeMembership?.organization || null;

    return NextResponse.json({
      isPaused: org?.isPaused ?? false,
      paymentStatus: org?.isPaused ? "UNPAID" : "PAID",
      pendingJoinOrgCode: pendingMembership?.organization?.code || null,
      shopId: org?.id || null,
      role: user.role,
      orgRole: activeMembership?.role || null,
      orgCode: org?.code || null,
      status: dbUser.isActive ? "ACTIVE" : "DISABLED",
      trialStartDate: org?.createdAt?.toISOString() || null,
      trialEndDate: null,
    });
  } catch (error) {
    console.error("[auth/account-status]", error);
    return NextResponse.json(
      { error: "Unable to check account status" },
      { status: 500 }
    );
  }
}
