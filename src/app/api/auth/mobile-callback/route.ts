import { encode } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/mobile-callback?mobileCallback=<deep-link>
 *
 * After Google OAuth completes via NextAuth, the user is redirected here.
 * We extract the session, build a mobile JWT, and redirect to the
 * mobile app's deep link with user data and token as query params.
 */
export async function GET(req: NextRequest) {
  try {
    const mobileCallback = req.nextUrl.searchParams.get("mobileCallback");

    if (!mobileCallback) {
      return NextResponse.json(
        { error: "Missing mobile callback URL" },
        { status: 400 }
      );
    }

    // Get the session created by NextAuth OAuth flow
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      // Redirect back to mobile with error
      const errorUrl = new URL(mobileCallback);
      errorUrl.searchParams.set("error", "auth_failed");
      return NextResponse.redirect(errorUrl);
    }

    const sessionUser = session.user as any;

    // Fetch full user data
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        profile: true,
        memberships: {
          include: { organization: true },
          where: { status: "ACTIVE" },
        },
        defaultOrganization: true,
      },
    });

    if (!dbUser) {
      const errorUrl = new URL(mobileCallback);
      errorUrl.searchParams.set("error", "user_not_found");
      return NextResponse.redirect(errorUrl);
    }

    const org =
      dbUser.defaultOrganization ||
      dbUser.memberships[0]?.organization ||
      null;
    const membership = dbUser.memberships[0] || null;

    // Create mobile JWT
    const token = await encode({
      token: {
        id: dbUser.id,
        sub: dbUser.id,
        email: dbUser.email,
        name: dbUser.profile?.fullName || dbUser.email,
        currentOrganizationId: org?.id || undefined,
        organizationName: org?.name || undefined,
        role: membership?.role || "STAFF",
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const userData = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.profile?.fullName || dbUser.email,
      phone: dbUser.profile?.phone || null,
      role: membership?.role || "STAFF",
      profileImage: dbUser.profile?.profilePictureUrl || null,
      shopName: org?.name || null,
      orgRole: membership?.role || null,
      orgCode: org?.code || null,
      onboardingCompleted: org?.onboardingCompleted ?? false,
    };

    // Redirect to mobile app with data
    const redirectUrl = new URL(mobileCallback);
    redirectUrl.searchParams.set("user", JSON.stringify(userData));
    redirectUrl.searchParams.set("token", token);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[auth/mobile-callback]", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}
