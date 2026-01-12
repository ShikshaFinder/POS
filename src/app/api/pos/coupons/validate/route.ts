import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/pos/coupons/validate - Validate and calculate discount for a coupon code
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
    const { code, customerId, orderAmount, productIds } = body

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json({ error: 'Valid order amount is required' }, { status: 400 })
    }

    // Find the coupon
    const coupon = await prisma.couponCode.findFirst({
      where: {
        organizationId: session.user.currentOrganizationId,
        code: code.toUpperCase(),
      },
      include: {
        redemptions: customerId ? {
          where: {
            customerId,
          },
        } : false,
      },
    })

    if (!coupon) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid coupon code',
          errorCode: 'INVALID_CODE'
        },
        { status: 400 }
      )
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This coupon is no longer active',
          errorCode: 'INACTIVE'
        },
        { status: 400 }
      )
    }

    // Check validity dates
    const now = new Date()
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This coupon is not yet valid',
          errorCode: 'NOT_YET_VALID',
          validFrom: coupon.validFrom
        },
        { status: 400 }
      )
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This coupon has expired',
          errorCode: 'EXPIRED',
          validUntil: coupon.validUntil
        },
        { status: 400 }
      )
    }

    // Check minimum purchase requirement
    if (coupon.minPurchase && orderAmount < coupon.minPurchase) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum purchase of ${coupon.minPurchase} required`,
          errorCode: 'MINIMUM_NOT_MET',
          minPurchase: coupon.minPurchase
        },
        { status: 400 }
      )
    }

    // Check total usage limit
    if (coupon.totalUsageLimit && coupon.currentUsageCount >= coupon.totalUsageLimit) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This coupon has reached its usage limit',
          errorCode: 'USAGE_LIMIT_REACHED'
        },
        { status: 400 }
      )
    }

    // Check per-customer usage limit
    if (customerId && coupon.maxUsagePerCustomer) {
      const customerUsageCount = (coupon.redemptions as any[])?.length || 0
      if (customerUsageCount >= coupon.maxUsagePerCustomer) {
        return NextResponse.json(
          {
            valid: false,
            error: 'You have already used this coupon the maximum number of times',
            errorCode: 'CUSTOMER_LIMIT_REACHED',
            maxUsagePerCustomer: coupon.maxUsagePerCustomer
          },
          { status: 400 }
        )
      }
    }

    // Check product targeting (if specified)
    if (productIds && productIds.length > 0) {
      if (coupon.targetProducts.length > 0) {
        // Use Set for O(1) lookup performance
        const targetProductsSet = new Set(coupon.targetProducts)
        const hasTargetProduct = productIds.some((id: string) => 
          targetProductsSet.has(id)
        )
        if (!hasTargetProduct) {
          return NextResponse.json(
            {
              valid: false,
              error: 'This coupon is not applicable to the products in your order',
              errorCode: 'PRODUCT_NOT_ELIGIBLE'
            },
            { status: 400 }
          )
        }
      }

      // Check excluded products with Set for performance
      if (coupon.excludeProducts.length > 0) {
        const excludeProductsSet = new Set(coupon.excludeProducts)
        const hasExcludedProduct = productIds.some((id: string) => 
          excludeProductsSet.has(id)
        )
        if (hasExcludedProduct) {
          return NextResponse.json(
            {
              valid: false,
              error: 'This coupon cannot be used with some products in your order',
              errorCode: 'PRODUCT_EXCLUDED'
            },
            { status: 400 }
          )
        }
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderAmount * coupon.discountValue) / 100
      // Apply max discount cap if specified
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = coupon.discountValue
      // Don't exceed order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount
      }
    }

    const finalAmount = orderAmount - discountAmount

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount: {
        amount: discountAmount,
        orderAmount,
        finalAmount,
      },
    })
  } catch (error) {
    console.error('Failed to validate coupon:', error)
    return NextResponse.json(
      { error: 'Failed to validate coupon' },
      { status: 500 }
    )
  }
}
