import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.globalCategory.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    });

    const products = categories.flatMap((c) => c.products);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        nameEn: p.nameEn,
        nameHi: p.nameHi,
        nameGu: p.nameGu,
        image: p.image,
        categoryId: p.categoryId,
        price: p.price,
        description: p.description,
        costPrice: p.costPrice,
        unit: p.unit,
        barcode: p.barcode,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        nameHi: c.nameHi,
        nameGu: c.nameGu,
        icon: c.icon,
        image: c.image,
      })),
    });
  } catch (error) {
    console.error("[pos/global-products GET]", error);
    return NextResponse.json({ error: "Failed to fetch global products" }, { status: 500 });
  }
}
