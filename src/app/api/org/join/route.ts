import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

const joinOrgSchema = z.object({
  orgCode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid organization code" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { code: parsed.data.orgCode },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found with this code" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === "ACTIVE") {
        return NextResponse.json(
          { error: "You are already a member of this organization" },
          { status: 409 }
        );
      }
      if (existingMembership.status === "PENDING") {
        return NextResponse.json(
          { error: "Your join request is pending approval" },
          { status: 409 }
        );
      }
      // Re-activate rejected membership as new pending request
      await prisma.organizationMembership.update({
        where: { id: existingMembership.id },
        data: { status: "PENDING", role: "MEMBER" },
      });
    } else {
      await prisma.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "MEMBER",
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ orgName: org.name });
  } catch (error) {
    console.error("[org/join]", error);
    return NextResponse.json(
      { error: "Unable to join organization" },
      { status: 500 }
    );
  }
}
