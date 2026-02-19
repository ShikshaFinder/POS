import bcrypt from "bcryptjs";
import type { NextAuthOptions, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Please provide both email and password.");
        }

        const email = credentials.email.toLowerCase();

        // Find user and include organization membership
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                organization: true
              }
            },
            defaultOrganization: true,
            profile: true
          }
        });

        if (!user || !user.password) {
          throw new Error("Incorrect email or password.");
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in.");
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error("Your account has been deactivated. Please contact support.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Incorrect email or password.");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        // Determine current organization
        // Priority:
        // 1. Default Org (if it has catalog enabled)
        // 2. Any organization with catalog enabled
        // 3. Default Org (fallback)
        // 4. First available membership

        const defaultOrg = user.defaultOrganization;
        const catalogOrgMembership = user.memberships.find(m => m.organization.catalogEnabled);

        let currentOrgId = user.defaultOrganizationId;

        if (defaultOrg?.catalogEnabled) {
          currentOrgId = user.defaultOrganizationId;
        } else if (catalogOrgMembership) {
          currentOrgId = catalogOrgMembership.organizationId;
        } else {
          currentOrgId = user.defaultOrganizationId || user.memberships[0]?.organizationId;
        }

        // Get the membership for the current organization
        const currentMembership = user.memberships.find(
          m => m.organizationId === currentOrgId
        );

        // Logic to pick the BEST organization name
        let organizationName = "Flavi POS";

        if (currentMembership?.organization) {
          organizationName = currentMembership.organization.name;
        } else if (defaultOrg && currentOrgId === user.defaultOrganizationId) {
          organizationName = defaultOrg.name;
        } else if (user.memberships.length > 0) {
          // Fallback to the first available membership's organization name
          organizationName = user.memberships[0].organization.name;
        }

        // Fetch POS Location if user is an owner and we have an organization ID
        let posLocation = null;
        if (currentOrgId) {
          posLocation = await prisma.pOSLocation.findFirst({
            where: {
              ownerId: user.id,
              organizationId: currentOrgId
            },
            select: {
              id: true,
              type: true
            }
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName || email,
          currentOrganizationId: currentOrgId,
          organizationName: organizationName,
          role: currentMembership?.role || "STAFF",
          profile: {
            phone: user.profile?.phone,
            address: user.profile?.address,
            postalCode: user.profile?.postalCode,
            city: user.profile?.city,
            country: user.profile?.country,
            bio: user.profile?.bio,
            website: null // Schema doesn't have website yet
          },
          posLocationId: posLocation?.id,
          posType: posLocation?.type
        } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.currentOrganizationId = (user as any).currentOrganizationId;
        token.organizationName = (user as any).organizationName;
        token.role = (user as any).role;
        token.profile = (user as any).profile;
        token.posLocationId = (user as any).posLocationId;
        token.posType = (user as any).posType;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id || token.sub) as string;
        (session.user as any).currentOrganizationId = token.currentOrganizationId as string;
        (session.user as any).organizationName = token.organizationName as string;
        (session.user as any).role = token.role as string;
        (session.user as any).profile = token.profile;
        (session.user as any).posLocationId = token.posLocationId;
        (session.user as any).posType = token.posType;
      }
      return session;
    },
  },
};

