import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";
import { prisma } from "@/lib/prisma";

const cloneSchema = z.object({
  globalProductIds: z.array(z.string()),
  language: z.enum(["en", "hi", "gu"]).default("en"),
  stockQuantities: z.record(z.string(), z.number()).optional(),
  costPrices: z.record(z.string(), z.number()).optional(),
  sellingPrices: z.record(z.string(), z.number()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = cloneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { globalProductIds, language, stockQuantities, costPrices, sellingPrices } =
      parsed.data;

    // Fetch global products
    const globalProducts = await prisma.globalProduct.findMany({
      where: { id: { in: globalProductIds } },
      include: { category: true },
    });

    if (globalProducts.length === 0) {
      return NextResponse.json({ clonedCount: 0, products: [] });
    }

    // Find or create local categories for the org
    const categoryMap = new Map<string, string>();
    for (const gp of globalProducts) {
      if (!categoryMap.has(gp.categoryId)) {
        const catName =
          language === "hi"
            ? gp.category.nameHi
            : language === "gu"
              ? gp.category.nameGu
              : gp.category.nameEn || gp.category.name;

        // Find existing category or create
        let localCat = await prisma.productCategory.findFirst({
          where: {
            organizationId: user.currentOrganizationId,
            name: catName || gp.category.name,
          },
        });

        if (!localCat) {
          const slug = (catName || gp.category.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          localCat = await prisma.productCategory.create({
            data: {
              organizationId: user.currentOrganizationId,
              name: catName || gp.category.name,
              slug: `${slug}-${Date.now().toString(36)}`,
              iconUrl: gp.category.image || undefined,
            },
          });
        }

        categoryMap.set(gp.categoryId, localCat.id);
      }
    }

    // Clone products
    const clonedProducts = [];
    for (const gp of globalProducts) {
      const productName =
        language === "hi"
          ? gp.nameHi
          : language === "gu"
            ? gp.nameGu
            : gp.nameEn || gp.name;

      const localCatId = categoryMap.get(gp.categoryId)!;
      const customCost = costPrices?.[gp.id];
      const customPrice = sellingPrices?.[gp.id];

      const product = await prisma.product.create({
        data: {
          organizationId: user.currentOrganizationId,
          name: productName || gp.name,
          category: gp.category.name,
          categoryId: localCatId,
          description: gp.description || undefined,
          unit: gp.unit || "Pcs",
          sku: gp.barcode || undefined,
          costPrice: customCost ?? gp.costPrice,
          unitPrice: customPrice ?? gp.price,
          markedPrice: customPrice ?? gp.price,
        },
      });

      clonedProducts.push(product);
    }

    return NextResponse.json({
      clonedCount: clonedProducts.length,
      products: clonedProducts,
    });
  } catch (error) {
    console.error("[pos/global-products/clone POST]", error);
    return NextResponse.json(
      { error: "Failed to clone products" },
      { status: 500 }
    );
  }
}
