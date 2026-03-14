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

    const profile = await prisma.pOSTaxProfile.findUnique({
      where: { organizationId: user.currentOrganizationId },
    });

    if (!profile) {
      return NextResponse.json({
        id: null,
        panNumber: null,
        gstNumber: null,
        businessType: null,
        bankAccountNumber: null,
        bankIFSC: null,
        bankName: null,
        financialYear: null,
        employeeCount: null,
        otherIncome: null,
        notes: null,
        submittedAt: null,
      });
    }

    return NextResponse.json({
      id: profile.id,
      panNumber: profile.panNumber,
      gstNumber: profile.gstNumber,
      businessType: profile.businessType,
      bankAccountNumber: profile.bankAccountNumber,
      bankIFSC: profile.bankIFSC,
      bankName: profile.bankName,
      financialYear: profile.financialYear,
      employeeCount: profile.employeeCount,
      otherIncome: profile.otherIncome,
      notes: profile.notes,
      submittedAt: profile.submittedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("[pos/tax-profile GET]", error);
    return NextResponse.json({ error: "Failed to fetch tax profile" }, { status: 500 });
  }
}

const saveProfileSchema = z.object({
  panNumber: z.string().nullable().optional(),
  gstNumber: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccountNumber: z.string().nullable().optional(),
  bankIFSC: z.string().nullable().optional(),
  financialYear: z.string().nullable().optional(),
  employeeCount: z.number().nullable().optional(),
  otherIncome: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = saveProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const profile = await prisma.pOSTaxProfile.upsert({
      where: { organizationId: user.currentOrganizationId },
      create: {
        organizationId: user.currentOrganizationId,
        ...parsed.data,
      },
      update: parsed.data,
    });

    return NextResponse.json({
      id: profile.id,
      panNumber: profile.panNumber,
      gstNumber: profile.gstNumber,
      businessType: profile.businessType,
      bankAccountNumber: profile.bankAccountNumber,
      bankIFSC: profile.bankIFSC,
      bankName: profile.bankName,
      financialYear: profile.financialYear,
      employeeCount: profile.employeeCount,
      otherIncome: profile.otherIncome,
      notes: profile.notes,
      submittedAt: profile.submittedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("[pos/tax-profile POST]", error);
    return NextResponse.json({ error: "Failed to save tax profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.action === "submit") {
      const profile = await prisma.pOSTaxProfile.update({
        where: { organizationId: user.currentOrganizationId },
        data: { submittedAt: new Date() },
      });

      return NextResponse.json({
        id: profile.id,
        submittedAt: profile.submittedAt?.toISOString() || null,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[pos/tax-profile PATCH]", error);
    return NextResponse.json({ error: "Failed to update tax profile" }, { status: 500 });
  }
}
