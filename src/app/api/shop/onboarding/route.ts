import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      onboardingCompleted: true,
      onboardingSteps: null,
    });
  } catch (error) {
    console.error("[shop/onboarding GET]", error);
    return NextResponse.json(
      { error: "Unable to check onboarding status" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.currentOrganizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    await prisma.organization.update({
      where: { id: user.currentOrganizationId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[shop/onboarding PUT]", error);
    return NextResponse.json(
      { error: "Unable to update onboarding status" },
      { status: 500 }
    );
  }
}
