import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth-mobile";

/**
 * POST /api/pos/invoice/parse
 *
 * Parses an invoice image using OCR/AI to extract product data.
 * The mobile app sends a base64-encoded image.
 */

const parseSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string().default("image/jpeg"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = parseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // TODO: Implement OCR/AI invoice parsing (Google Vision, Azure AI, etc.)
    // For now, return a placeholder response that indicates no products found
    // The mobile app handles this gracefully and allows manual entry

    return NextResponse.json({
      supplierName: null,
      invoiceDate: null,
      invoiceNumber: null,
      invoiceImageUrl: null,
      products: [],
      totalProductsFound: 0,
    });
  } catch (error) {
    console.error("[pos/invoice/parse POST]", error);
    return NextResponse.json(
      { error: "Failed to parse invoice" },
      { status: 500 }
    );
  }
}
