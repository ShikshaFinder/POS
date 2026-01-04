import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/sessions - Get current and past sessions
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id
        const { searchParams } = new URL(req.url)
        const current = searchParams.get('current') === 'true'

        if (current) {
            // Get current open session for this cashier
            const currentSession = await prisma.pOSSession.findFirst({
                where: {
                    organizationId,
                    cashierId: userId,
                    status: 'OPEN'
                },
                include: {
                    cashier: {
                        select: { 
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullName: true
                                }
                            }
                        }
                    }
                }
            })

            return NextResponse.json({ session: currentSession })
        }

        // Get all sessions for this organization
        const sessions = await prisma.pOSSession.findMany({
            where: { organizationId },
            include: {
                cashier: {
                    select: { 
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            },
            orderBy: { openedAt: 'desc' },
            take: 50
        })

        return NextResponse.json({ sessions })
    } catch (error) {
        console.error('Error fetching sessions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch sessions' },
            { status: 500 }
        )
    }
}

// POST /api/pos/sessions - Open new session
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id
        const body = await req.json()
        const { openingBalance = 0 } = body

        // Check if there's already an open session for this cashier
        const existingSession = await prisma.pOSSession.findFirst({
            where: {
                organizationId,
                cashierId: userId,
                status: 'OPEN'
            }
        })

        if (existingSession) {
            return NextResponse.json(
                { error: 'You already have an open session. Close it before opening a new one.' },
                { status: 400 }
            )
        }

        // Generate session number
        const today = new Date()
        const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
        const count = await prisma.pOSSession.count({
            where: {
                organizationId,
                openedAt: {
                    gte: new Date(today.setHours(0, 0, 0, 0))
                }
            }
        })
        const sessionNumber = `SES-${datePrefix}-${String(count + 1).padStart(3, '0')}`

        // Create new session
        const newSession = await prisma.pOSSession.create({
            data: {
                organizationId,
                sessionNumber,
                cashierId: userId,
                openingBalance,
                status: 'OPEN'
            },
            include: {
                cashier: {
                    select: { 
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json({ session: newSession }, { status: 201 })
    } catch (error) {
        console.error('Error opening session:', error)
        return NextResponse.json(
            { error: 'Failed to open session' },
            { status: 500 }
        )
    }
}

// PATCH /api/pos/sessions - Close session
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const body = await req.json()
        const { sessionId, actualCash, notes } = body

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        // Get the session
        const posSession = await prisma.pOSSession.findFirst({
            where: {
                id: sessionId,
                organizationId
            }
        })

        if (!posSession) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            )
        }

        if (posSession.status !== 'OPEN') {
            return NextResponse.json(
                { error: 'Session is already closed' },
                { status: 400 }
            )
        }

        // Calculate expected cash
        const closingBalance = posSession.openingBalance + posSession.totalCash
        const cashDifference = (actualCash || 0) - closingBalance

        // Update session
        const updatedSession = await prisma.pOSSession.update({
            where: { id: sessionId },
            data: {
                closedAt: new Date(),
                closingBalance,
                actualCash,
                cashDifference,
                status: 'CLOSED',
                notes
            }
        })

        return NextResponse.json({ session: updatedSession })
    } catch (error) {
        console.error('Error closing session:', error)
        return NextResponse.json(
            { error: 'Failed to close session' },
            { status: 500 }
        )
    }
}
