
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      currentOrganizationId?: string;
      organizationName?: string;
      role?: string;
      profile?: {
        phone?: string | null;
        address?: string | null;
        postalCode?: string | null;
        city?: string | null;
        country?: string | null;
        bio?: string | null;
        website?: string | null;
      };
      posLocationId?: string;
      posType?: 'DAIRY_ASSOCIATED' | 'NON_DAIRY';
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    emailVerified?: Date | null;
    currentOrganizationId?: string;
    organizationName?: string;
    role?: string;
    profile?: {
      phone?: string | null;
      address?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
      bio?: string | null;
      website?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    currentOrganizationId?: string;
    organizationName?: string;
    role?: string;
    profile?: {
      phone?: string | null;
      address?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
      bio?: string | null;
      website?: string | null;
    };
  }
}
