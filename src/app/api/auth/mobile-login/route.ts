import { encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/mobile-login
 *
 * Initiates Google OAuth flow for mobile. The mobile app opens this URL
 * in a WebBrowser session. After Google auth, this redirects back to the
 * mobile app's deep link with user data and JWT token as query params.
 *
 * Query params:
 *   callbackUrl: The Expo deep link URL to redirect back to
 *
 * This route uses NextAuth's built-in Google provider flow.
 * The actual OAuth is handled by redirecting to NextAuth's signin endpoint.
 */
export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");

  if (!callbackUrl) {
    return NextResponse.json(
      { error: "callbackUrl is required" },
      { status: 400 }
    );
  }

  // Store the mobile callback URL in the state parameter
  // The actual Google OAuth is handled by NextAuth's provider
  const signinUrl = new URL("/api/auth/signin/google", req.nextUrl.origin);
  signinUrl.searchParams.set("callbackUrl", `/api/auth/mobile-callback?mobileCallback=${encodeURIComponent(callbackUrl)}`);

  return NextResponse.redirect(signinUrl);
}

/**
 * GET /api/auth/mobile-callback
 *
 * After NextAuth handles Google OAuth and creates a session,
 * this route extracts the user info, creates a JWT, and redirects
 * to the mobile app's deep link with user+token in query params.
 */
export async function POST() {
  // This endpoint is not used directly — the callback flow
  // is handled via the mobile-callback route
  return NextResponse.json({ error: "Use GET" }, { status: 405 });
}
