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

    const payments = await prisma.pOSUdharPayment.findMany({
      where: { organizationId: user.currentOrganizationId },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("[pos/udhar-payments GET]", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

const createPaymentSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  amount: z.number(),
  paymentMethod: z.string(),
  paymentDate: z.string().transform((s) => new Date(s)),
  dueDate: z.string().transform((s) => new Date(s)).optional(),
  status: z.string().default("pending"),
  notes: z.string().nullable().optional(),
  receiptNumber: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const payment = await prisma.pOSUdharPayment.create({
      data: {
        organizationId: user.currentOrganizationId,
        ...parsed.data,
        notes: parsed.data.notes || undefined,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[pos/udhar-payments POST]", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

const updatePaymentSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  confirmedBy: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { id, status, confirmedBy } = parsed.data;

    const payment = await prisma.pOSUdharPayment.findFirst({
      where: { id, organizationId: user.currentOrganizationId },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.pOSUdharPayment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(confirmedBy && { confirmedBy }),
        ...(status === "confirmed" && { confirmedAt: new Date() }),
      },
    });

    // Update customer balance if confirmed
    if (status === "confirmed") {
      await prisma.pOSCustomer.updateMany({
        where: {
          id: payment.customerId,
          organizationId: user.currentOrganizationId,
        },
        data: { totalSpent: { increment: -payment.amount } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/udhar-payments PATCH]", error);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}
