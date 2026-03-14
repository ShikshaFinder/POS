import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const supplier = await prisma.pOSSupplier.findFirst({
      where: { id, organizationId: user.currentOrganizationId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.pOSSupplier.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/suppliers/[id] PUT]", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supplier = await prisma.pOSSupplier.findFirst({
      where: { id, organizationId: user.currentOrganizationId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await prisma.pOSSupplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/suppliers/[id] DELETE]", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}
