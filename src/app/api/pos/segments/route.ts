import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/segments - Get all customer segments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const searchParams = req.nextUrl.searchParams
    const posLocationId = searchParams.get('posLocationId')

    const where: any = {
      organizationId: session.user.currentOrganizationId,
    }

    if (posLocationId) {
      where.posLocationId = posLocationId
    }

    const segments = await prisma.customerSegment.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        posLocation: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ segments })
  } catch (error) {
    console.error('Failed to fetch segments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch segments' },
      { status: 500 }
    )
  }
}

// POST /api/pos/segments - Create new customer segment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await req.json()
    const {
      name,
      description,
      color,
      criteria,
      isDynamic,
      posLocationId,
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Segment name is required' },
        { status: 400 }
      )
    }

    // Check if segment name already exists
    const existing = await prisma.customerSegment.findFirst({
      where: {
        organizationId: session.user.currentOrganizationId,
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Segment with this name already exists' },
        { status: 400 }
      )
    }

    // If dynamic segment, calculate initial member count
    let memberCount = 0
    if (isDynamic && criteria) {
      const customerWhere = buildCustomerWhereClause(
        session.user.currentOrganizationId,
        posLocationId,
        criteria
      )
      memberCount = await prisma.pOSCustomer.count({ where: customerWhere })
    }

    const segment = await prisma.customerSegment.create({
      data: {
        organizationId: session.user.currentOrganizationId,
        posLocationId,
        name,
        description,
        color,
        criteria,
        isDynamic: isDynamic !== undefined ? isDynamic : true,
        memberCount,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        posLocation: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // If dynamic segment, create initial member records
    if (isDynamic && criteria) {
      const customers = await prisma.pOSCustomer.findMany({
        where: buildCustomerWhereClause(
          session.user.currentOrganizationId,
          posLocationId,
          criteria
        ),
        select: { id: true },
      })

      if (customers.length > 0) {
        await prisma.customerSegmentMember.createMany({
          data: customers.map((customer) => ({
            segmentId: segment.id,
            customerId: customer.id,
          })),
        })
      }
    }

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    console.error('Failed to create segment:', error)
    return NextResponse.json(
      { error: 'Failed to create segment' },
      { status: 500 }
    )
  }
}

// Helper function to build customer where clause from criteria
function buildCustomerWhereClause(
  organizationId: string,
  posLocationId: string | null,
  criteria: any
): any {
  const where: any = {
    organizationId,
  }

  if (posLocationId) {
    where.posLocationId = posLocationId
  }

  if (criteria.minSpent !== undefined) {
    where.totalSpent = { gte: criteria.minSpent }
  }

  if (criteria.maxSpent !== undefined) {
    where.totalSpent = { ...where.totalSpent, lte: criteria.maxSpent }
  }

  if (criteria.minVisits !== undefined) {
    where.visitCount = { gte: criteria.minVisits }
  }

  if (criteria.maxVisits !== undefined) {
    where.visitCount = { ...where.visitCount, lte: criteria.maxVisits }
  }

  if (criteria.tags && criteria.tags.length > 0) {
    where.tags = { hasSome: criteria.tags }
  }

  if (criteria.marketingConsent !== undefined) {
    where.marketingConsent = criteria.marketingConsent
  }

  if (criteria.lastVisitDaysAgo !== undefined) {
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - criteria.lastVisitDaysAgo)
    where.lastVisitDate = { lte: daysAgo }
  }

  return where
}
