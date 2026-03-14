import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/pos/sync/batch
 *
 * Processes a batch of offline operations from the mobile app.
 * Each operation specifies an entity, method, endpoint, and data.
 * Returns ID mappings for locally-created records.
 */
const batchSchema = z.object({
  operations: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["CREATE", "UPDATE", "DELETE"]),
      entity: z.string(),
      endpoint: z.string(),
      method: z.string(),
      data: z.any(),
      localId: z.string().optional(),
      timestamp: z.number(),
      retries: z.number().default(0),
      maxRetries: z.number().default(5),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid batch data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = user.currentOrganizationId;
    const results: Array<{ localId?: string; serverId: string; entity: string }> = [];

    for (const op of parsed.data.operations) {
      try {
        const result = await processOperation(op, orgId, user.id);
        if (result) {
          results.push(result);
        }
      } catch (opError) {
        console.error(`[sync/batch] Failed op ${op.id}:`, opError);
        // Continue processing other operations
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[pos/sync/batch POST]", error);
    return NextResponse.json(
      { error: "Batch sync failed" },
      { status: 500 }
    );
  }
}

async function processOperation(
  op: any,
  organizationId: string,
  userId: string
): Promise<{ localId?: string; serverId: string; entity: string } | null> {
  const { entity, type, data, localId } = op;

  switch (entity) {
    case "category": {
      if (type === "CREATE") {
        const slug = (data.name || "cat")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
        const cat = await prisma.productCategory.create({
          data: { organizationId, name: data.name, slug, iconUrl: data.image },
        });
        return { localId, serverId: cat.id, entity };
      }
      if (type === "UPDATE" && data.id) {
        await prisma.productCategory.update({
          where: { id: data.id },
          data: { name: data.name, iconUrl: data.image },
        });
      }
      if (type === "DELETE" && data.id) {
        await prisma.productCategory.delete({ where: { id: data.id } });
      }
      break;
    }

    case "product": {
      if (type === "CREATE") {
        const prod = await prisma.product.create({
          data: {
            organizationId,
            name: data.name,
            category: data.category || "General",
            categoryId: data.categoryId,
            unitPrice: data.price || data.sellingPrice,
            costPrice: data.costPrice,
            markedPrice: data.markedPrice || data.price,
            unit: data.unit || "Pcs",
            sku: data.barcode,
            description: data.description,
          },
        });
        return { localId, serverId: prod.id, entity };
      }
      if (type === "UPDATE" && data.id) {
        await prisma.product.update({
          where: { id: data.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.price && { unitPrice: data.price }),
            ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
            ...(data.unit && { unit: data.unit }),
          },
        });
      }
      if (type === "DELETE" && data.id) {
        await prisma.product.delete({ where: { id: data.id } });
      }
      break;
    }

    case "customer": {
      if (type === "CREATE") {
        const cust = await prisma.pOSCustomer.create({
          data: {
            organizationId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
          },
        });
        return { localId, serverId: cust.id, entity };
      }
      if (type === "UPDATE" && data.id) {
        await prisma.pOSCustomer.update({
          where: { id: data.id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.address !== undefined && { address: data.address }),
          },
        });
      }
      if (type === "DELETE" && data.id) {
        await prisma.pOSCustomer.delete({ where: { id: data.id } });
      }
      break;
    }

    case "transaction": {
      if (type === "CREATE") {
        const tx = await prisma.pOSTransaction.create({
          data: {
            organizationId,
            cashierId: userId,
            receiptNumber: data.receiptNumber || `TX${Date.now()}`,
            transactionDate: new Date(data.transactionDate || Date.now()),
            status: data.status || "COMPLETED",
            subtotal: data.subtotal || 0,
            discountAmount: data.discountAmount || 0,
            taxAmount: data.taxAmount || 0,
            totalAmount: data.totalAmount || 0,
            paidAmount: data.paidAmount || data.amountPaid || 0,
            changeAmount: data.changeAmount || data.changeGiven || 0,
            paymentMethod: data.paymentMethod || "CASH",
            customerId: data.customerId || undefined,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            cashAmount: data.cashAmount || 0,
            cardAmount: data.cardAmount || 0,
            upiAmount: data.upiAmount || 0,
          },
        });
        return { localId, serverId: tx.id, entity };
      }
      break;
    }

    case "supplier": {
      if (type === "CREATE") {
        const sup = await prisma.pOSSupplier.create({
          data: { organizationId, ...data },
        });
        return { localId, serverId: sup.id, entity };
      }
      if (type === "UPDATE" && data.id) {
        const { id: supId, ...updateData } = data;
        await prisma.pOSSupplier.update({ where: { id: supId }, data: updateData });
      }
      if (type === "DELETE" && data.id) {
        await prisma.pOSSupplier.delete({ where: { id: data.id } });
      }
      break;
    }

    case "udhar-payment": {
      if (type === "CREATE") {
        const payment = await prisma.pOSUdharPayment.create({
          data: {
            organizationId,
            customerId: data.customerId,
            customerName: data.customerName,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paymentDate: new Date(data.paymentDate),
            status: data.status || "pending",
            notes: data.notes,
            receiptNumber: data.receiptNumber,
          },
        });
        return { localId, serverId: payment.id, entity };
      }
      if (type === "UPDATE" && data.id) {
        await prisma.pOSUdharPayment.update({
          where: { id: data.id },
          data: {
            ...(data.status && { status: data.status }),
            ...(data.confirmedBy && { confirmedBy: data.confirmedBy }),
            ...(data.status === "confirmed" && { confirmedAt: new Date() }),
          },
        });
      }
      break;
    }

    case "stock-adjust":
    case "stock-receive":
    case "stock-count": {
      // Stock operations — these are handled by the existing stock routes
      // For batch sync, we create the stock adjustment record
      if (type === "CREATE" && data.productId) {
        // Update product stock directly
        const product = await prisma.product.findUnique({
          where: { id: data.productId },
        });
        if (product) {
          const currentStock = (product as any).currentStock || 0;
          const adjustment = data.quantity || 0;
          await prisma.product.update({
            where: { id: data.productId },
            data: { currentStock: currentStock + adjustment } as any,
          });
        }
      }
      break;
    }
  }

  return null;
}
