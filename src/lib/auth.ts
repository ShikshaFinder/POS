import bcrypt from "bcryptjs";
import type { NextAuthOptions, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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
        const currentOrgId = user.defaultOrganizationId || 
                            user.memberships[0]?.organizationId;

        // Get the membership for the current organization
        const currentMembership = user.memberships.find(
          m => m.organizationId === currentOrgId
        );

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName || email,
          currentOrganizationId: currentOrgId,
          role: currentMembership?.role || "STAFF",
        } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.currentOrganizationId = (user as any).currentOrganizationId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).currentOrganizationId = token.currentOrganizationId as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
};

