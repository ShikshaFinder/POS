import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.currentOrganizationId;
    const params = req.nextUrl.searchParams;
    const preset = params.get("preset") || "30";
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "50");
    const productId = params.get("productId");
    const status = params.get("status");

    // Calculate date range
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case "7":
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case "90":
        from = new Date(now.getTime() - 90 * 86400000);
        break;
      case "thisMonth":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastMonth":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default: // "30"
        from = new Date(now.getTime() - 30 * 86400000);
    }

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    // Query batches
    const where: any = {
      organizationId: orgId,
      date: { gte: fromStr, lte: toStr },
      ...(status && { status }),
    };

    const totalBatches = await prisma.pOSDailyBatch.count({ where });
    const totalPages = Math.ceil(totalBatches / limit);

    const batches = await prisma.pOSDailyBatch.findMany({
      where,
      include: {
        items: {
          ...(productId && { where: { productId } }),
          orderBy: { processedAt: "asc" },
        },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate summary
    const allBatches = await prisma.pOSDailyBatch.findMany({ where });
    const totalDaysProcessed = allBatches.filter(
      (b) => b.status === "completed"
    ).length;
    const totalHolidayDays = allBatches.filter(
      (b) => b.status === "skipped_holiday"
    ).length;
    const totalAmount = allBatches.reduce((s, b) => s + b.totalAmount, 0);
    const totalItemsProcessed = allBatches.reduce(
      (s, b) => s + b.totalItemsProcessed,
      0
    );

    // Customer breakdown
    const allItems = batches.flatMap((b) => b.items);
    const customerMap = new Map<
      string,
      { name: string; totalAmount: number; totalItems: number; products: Set<string> }
    >();
    for (const item of allItems) {
      const existing = customerMap.get(item.customerId) || {
        name: "",
        totalAmount: 0,
        totalItems: 0,
        products: new Set<string>(),
      };
      existing.totalAmount += item.amount;
      existing.totalItems += item.quantity;
      existing.products.add(item.productName);
      customerMap.set(item.customerId, existing);
    }

    // Get customer names
    const customerIds = [...customerMap.keys()];
    const customers = await prisma.pOSCustomer.findMany({
      where: { id: { in: customerIds }, organizationId: orgId },
    });
    for (const c of customers) {
      const entry = customerMap.get(c.id);
      if (entry) entry.name = c.name;
    }

    // Products list for filter
    const productNames = new Set<string>();
    for (const item of allItems) {
      productNames.add(item.productName);
    }

    return NextResponse.json({
      success: true,
      ledger: {
        from: fromStr,
        to: toStr,
        page,
        limit,
        totalBatches,
        totalPages,
        batches: batches.map((b) => ({
          id: b.id,
          date: b.date,
          status: b.status,
          totalCustomers: new Set(b.items.map((i) => i.customerId)).size,
          totalItemsProcessed: b.totalItemsProcessed,
          totalAmount: b.totalAmount,
          createdAt: b.createdAt.toISOString(),
          items: b.items.map((i) => ({
            id: i.id,
            customerId: i.customerId,
            dailyItemId: i.dailyItemId,
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            amount: i.amount,
            transactionId: i.transactionId,
            isBacktrack: i.isBacktrack,
            deliverySlot: i.deliverySlot,
            processedAt: i.processedAt.toISOString(),
          })),
        })),
      },
      summary: {
        totalDaysProcessed,
        totalHolidayDays,
        totalAmount,
        totalItemsProcessed,
      },
      customerBreakdown: [...customerMap.entries()].map(([id, data]) => ({
        customerId: id,
        customerName: data.name,
        totalAmount: data.totalAmount,
        totalItems: data.totalItems,
        products: [...data.products],
      })),
      productOptions: [...productNames].map((name, i) => ({
        id: `prod_${i}`,
        name,
      })),
    });
  } catch (error) {
    console.error("[pos/daily-subscriptions/ledger GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger" },
      { status: 500 }
    );
  }
}
