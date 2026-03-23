import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const batch = await prisma.pOSDailyBatch.findUnique({
      where: {
        organizationId_date: {
          organizationId: user.currentOrganizationId,
          date: today,
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ batchExists: false });
    }

    return NextResponse.json({
      batchExists: true,
      batch: {
        status: batch.status,
        totalItemsProcessed: batch.totalItemsProcessed,
        totalAmount: batch.totalAmount,
      },
    });
  } catch (error) {
    console.error("[pos/daily-subscriptions/backtrack GET]", error);
    return NextResponse.json(
      { error: "Failed to check daily batch" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, dailyItem, action } = body;

    const today = new Date().toISOString().split("T")[0];
    const orgId = user.currentOrganizationId;

    // Get or create today's batch
    let batch = await prisma.pOSDailyBatch.findUnique({
      where: { organizationId_date: { organizationId: orgId, date: today } },
    });

    if (!batch) {
      batch = await prisma.pOSDailyBatch.create({
        data: {
          organizationId: orgId,
          date: today,
          status: "processing",
        },
      });
    }

    if (action === "add" && dailyItem) {
      const amount = (dailyItem.quantity || 1) * (dailyItem.price || 0);

      await prisma.pOSDailyBatchItem.create({
        data: {
          batchId: batch.id,
          customerId,
          dailyItemId: dailyItem.id,
          productId: dailyItem.productId,
          productName: dailyItem.productName || "Unknown",
          quantity: dailyItem.quantity || 1,
          amount,
          deliverySlot: dailyItem.deliverySlot,
          isBacktrack: true,
        },
      });

      // Update batch totals
      await prisma.pOSDailyBatch.update({
        where: { id: batch.id },
        data: {
          totalItemsProcessed: { increment: 1 },
          totalAmount: { increment: amount },
          status: "completed",
        },
      });

      return NextResponse.json({ backtracked: true, amount });
    }

    if (action === "delete" && dailyItem) {
      const amount = (dailyItem.quantity || 1) * (dailyItem.price || 0);

      // Remove matching batch item
      const existing = await prisma.pOSDailyBatchItem.findFirst({
        where: {
          batchId: batch.id,
          customerId,
          dailyItemId: dailyItem.id,
        },
      });

      if (existing) {
        await prisma.pOSDailyBatchItem.delete({ where: { id: existing.id } });

        await prisma.pOSDailyBatch.update({
          where: { id: batch.id },
          data: {
            totalItemsProcessed: { decrement: 1 },
            totalAmount: { decrement: amount },
          },
        });
      }

      return NextResponse.json({ backtracked: true, reversedAmount: amount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[pos/daily-subscriptions/backtrack POST]", error);
    return NextResponse.json(
      { error: "Failed to process backtrack" },
      { status: 500 }
    );
  }
}
