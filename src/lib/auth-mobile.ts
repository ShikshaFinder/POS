import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { authOptions } from './auth'

export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  currentOrganizationId: string
  organizationName?: string
  role: string
}

/**
 * Authenticate a request from either:
 * 1. NextAuth session cookie (web)
 * 2. Authorization: Bearer <JWT> header (mobile)
 *
 * Returns the authenticated user or null.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  // Try NextAuth session first (web cookies)
  const session = await getServerSession(authOptions)
  if (session?.user) {
    const user = session.user as any
    return {
      id: user.id,
      email: user.email || '',
      name: user.name || '',
      currentOrganizationId: user.currentOrganizationId,
      organizationName: user.organizationName,
      role: user.role || 'STAFF',
    }
  }

  // Fallback: try JWT from Authorization header (mobile)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (token) {
    return {
      id: (token.id || token.sub) as string,
      email: token.email || '',
      name: (token.name as string) || '',
      currentOrganizationId: token.currentOrganizationId as string,
      organizationName: token.organizationName as string,
      role: (token.role as string) || 'STAFF',
    }
  }

  return null
}
