import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/coupons - Get all coupon codes
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
    const status = searchParams.get('status') // 'active', 'expired', 'all'
    const posLocationId = searchParams.get('posLocationId')

    const where: any = {
      organizationId: session.user.currentOrganizationId,
    }

    if (posLocationId) {
      where.posLocationId = posLocationId
    }

    // Filter by status
    if (status === 'active') {
      where.isActive = true
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    } else if (status === 'expired') {
      where.validUntil = { lt: new Date() }
    }

    const coupons = await prisma.couponCode.findMany({
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
            redemptions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Failed to fetch coupons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

// POST /api/pos/coupons - Create new coupon code
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
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minPurchase,
      maxUsagePerCustomer,
      totalUsageLimit,
      validFrom,
      validUntil,
      isActive,
      targetProducts,
      targetCategories,
      targetCustomerTags,
      excludeProducts,
      posLocationId,
      notes,
    } = body

    // Validate required fields
    if (!code || !name || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, discountType, discountValue' },
        { status: 400 }
      )
    }

    // Validate discount type
    const validDiscountTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y']
    if (!validDiscountTypes.includes(discountType)) {
      return NextResponse.json(
        { error: 'Invalid discount type' },
        { status: 400 }
      )
    }

    // Check if coupon code already exists
    const existing = await prisma.couponCode.findFirst({
      where: {
        organizationId: session.user.currentOrganizationId,
        code: code.toUpperCase(),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400 }
      )
    }

    const coupon = await prisma.couponCode.create({
      data: {
        organizationId: session.user.currentOrganizationId,
        posLocationId,
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        maxDiscount,
        minPurchase: minPurchase || 0,
        maxUsagePerCustomer: maxUsagePerCustomer || 1,
        totalUsageLimit,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== undefined ? isActive : true,
        targetProducts: targetProducts || [],
        targetCategories: targetCategories || [],
        targetCustomerTags: targetCustomerTags || [],
        excludeProducts: excludeProducts || [],
        createdById: session.user.id,
        notes,
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

    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error) {
    console.error('Failed to create coupon:', error)
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    )
  }
}
