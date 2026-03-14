import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

const holidaySchema = z.object({
  date: z.string(),
  isFullDay: z.boolean().default(true),
  slots: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const holidays = await prisma.pOSHoliday.findMany({
      where: { organizationId: user.currentOrganizationId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      globalHolidays: holidays.map((h) => ({
        date: h.date,
        isFullDay: h.isFullDay,
        ...(h.slots.length > 0 && { slots: h.slots }),
      })),
    });
  } catch (error) {
    console.error("[pos/shop/holidays GET]", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

const saveHolidaysSchema = z.object({
  shopId: z.string().optional(), // Ignored — we use org from auth
  holidays: z.array(holidaySchema),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = saveHolidaysSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = user.currentOrganizationId;

    // Delete existing holidays and replace with new ones
    await prisma.pOSHoliday.deleteMany({
      where: { organizationId: orgId },
    });

    if (parsed.data.holidays.length > 0) {
      await prisma.pOSHoliday.createMany({
        data: parsed.data.holidays.map((h) => ({
          organizationId: orgId,
          date: h.date,
          isFullDay: h.isFullDay,
          slots: h.slots || [],
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pos/shop/holidays POST]", error);
    return NextResponse.json({ error: "Failed to save holidays" }, { status: 500 });
  }
}
