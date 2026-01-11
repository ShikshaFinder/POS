import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/campaigns - Get all email campaigns
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
    const status = searchParams.get('status')
    const campaignType = searchParams.get('campaignType')
    const posLocationId = searchParams.get('posLocationId')

    const where: any = {
      organizationId: session.user.currentOrganizationId,
    }

    if (posLocationId) {
      where.posLocationId = posLocationId
    }

    if (status) {
      where.status = status
    }

    if (campaignType) {
      where.campaignType = campaignType
    }

    const campaigns = await prisma.emailCampaign.findMany({
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
        couponCode: {
          select: {
            id: true,
            code: true,
            name: true,
            discountType: true,
            discountValue: true,
          },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/pos/campaigns - Create new email campaign
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
      subject,
      previewText,
      emailBody,
      campaignType,
      targetSegment,
      targetTags,
      minTotalSpent,
      maxTotalSpent,
      minVisitCount,
      scheduledAt,
      couponCodeId,
      posLocationId,
    } = body

    // Validate required fields
    if (!name || !subject || !emailBody || !campaignType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, emailBody, campaignType' },
        { status: 400 }
      )
    }

    // Validate campaign type
    const validCampaignTypes = [
      'PROMOTIONAL',
      'TRANSACTIONAL',
      'BIRTHDAY',
      'ANNIVERSARY',
      'FOLLOW_UP',
      'NEWSLETTER',
    ]
    if (!validCampaignTypes.includes(campaignType)) {
      return NextResponse.json(
        { error: 'Invalid campaign type' },
        { status: 400 }
      )
    }

    // Build customer targeting query
    const customerWhere: any = {
      organizationId: session.user.currentOrganizationId,
      marketingConsent: true,
      emailVerified: true,
      email: { not: null },
      unsubscribedAt: null,
    }

    if (posLocationId) {
      customerWhere.posLocationId = posLocationId
    }

    if (targetTags && targetTags.length > 0) {
      customerWhere.tags = { hasSome: targetTags }
    }

    if (minTotalSpent) {
      customerWhere.totalSpent = { gte: minTotalSpent }
    }

    if (maxTotalSpent) {
      customerWhere.totalSpent = { ...customerWhere.totalSpent, lte: maxTotalSpent }
    }

    if (minVisitCount) {
      customerWhere.visitCount = { gte: minVisitCount }
    }

    // Get recipient count
    const recipientCount = await prisma.pOSCustomer.count({
      where: customerWhere,
    })

    if (recipientCount === 0) {
      return NextResponse.json(
        { error: 'No customers match the targeting criteria' },
        { status: 400 }
      )
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        organizationId: session.user.currentOrganizationId,
        posLocationId,
        name,
        subject,
        previewText,
        emailBody,
        campaignType,
        targetSegment,
        targetTags: targetTags || [],
        minTotalSpent,
        maxTotalSpent,
        minVisitCount,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        couponCodeId,
        recipientCount,
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
        couponCode: {
          select: {
            id: true,
            code: true,
            name: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Failed to create campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
