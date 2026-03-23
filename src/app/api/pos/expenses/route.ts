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

    const month = req.nextUrl.searchParams.get("month"); // YYYY-MM

    let dateFilter: { gte?: Date; lt?: Date } = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      dateFilter = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }

    const expenses = await prisma.pOSExpense.findMany({
      where: {
        organizationId: user.currentOrganizationId,
        ...(month && { date: dateFilter }),
      },
      orderBy: { date: "desc" },
    });

    // Calculate category totals
    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      totalAmount += exp.amount;
    }

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        description: e.description,
        date: e.date.toISOString(),
      })),
      categoryTotals,
      totalAmount,
    });
  } catch (error) {
    console.error("[pos/expenses GET]", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

const createExpenseSchema = z.object({
  category: z.string(),
  amount: z.number().positive(),
  description: z.string().nullable().optional(),
  date: z.string().transform((s) => new Date(s)),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.pOSExpense.create({
      data: {
        organizationId: user.currentOrganizationId,
        createdById: user.id,
        ...parsed.data,
        description: parsed.data.description || undefined,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[pos/expenses POST]", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Expense ID required" }, { status: 400 });
    }

    const expense = await prisma.pOSExpense.findFirst({
      where: { id, organizationId: user.currentOrganizationId },
    });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.pOSExpense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/expenses DELETE]", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
