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

    const suppliers = await prisma.pOSSupplier.findMany({
      where: { organizationId: user.currentOrganizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("[pos/suppliers GET]", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

const createSupplierSchema = z.object({
  name: z.string().min(1),
  supplierCode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  gstNumber: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const supplier = await prisma.pOSSupplier.create({
      data: {
        organizationId: user.currentOrganizationId,
        ...parsed.data,
        email: parsed.data.email || undefined,
        address: parsed.data.address || undefined,
        city: parsed.data.city || undefined,
        state: parsed.data.state || undefined,
        pincode: parsed.data.pincode || undefined,
        gstNumber: parsed.data.gstNumber || undefined,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("[pos/suppliers POST]", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });
    }

    const supplier = await prisma.pOSSupplier.findFirst({
      where: { id, organizationId: user.currentOrganizationId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.pOSSupplier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/suppliers PATCH]", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}
