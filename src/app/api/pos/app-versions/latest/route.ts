import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pos/app-versions/latest
 *
 * Returns the latest app version info for the given platform.
 * Query params: ?platform=android|ios
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") || "android";

  // TODO: fetch from database when AppVersion model is available.
  // For now return a static response so the mobile client doesn't error out.
  return NextResponse.json({
    version: "1.0.0",
    minVersion: "1.0.0",
    forceUpdate: false,
    releaseNotes: "",
    downloadUrl:
      platform === "ios"
        ? null
        : null,
  });
}
