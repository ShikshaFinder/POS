import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Calculate price based on customer tier
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

        // Get user's POS location for org context
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedPOSLocations: { take: 1 }
            }
        })

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 })
        }

        const organizationId = user.ownedPOSLocations[0].organizationId

        const body = await req.json()
        const { customerId, productIds, tier: overrideTier } = body

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 })
        }

        // Determine customer tier
        let customerTier = 'CUSTOMER'

        if (overrideTier && ['VENDOR', 'RETAILER', 'CUSTOMER'].includes(overrideTier)) {
            customerTier = overrideTier
        } else if (customerId) {
            const connection = await prisma.connection.findFirst({
                where: { id: customerId, organizationId },
                select: { customerTier: true }
            })
            if (connection) {
                customerTier = connection.customerTier
            }
        }

        // Get products
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                organizationId
            },
            select: {
                id: true,
                name: true,
                sku: true,
                markedPrice: true,
                unitPrice: true,
                categoryId: true
            }
        })

        // Get tier pricing for products
        const productPricing = await (prisma as any).tierPricing.findMany({
            where: {
                organizationId,
                productId: { in: productIds },
                isActive: true
            }
        })
        const productPricingMap = new Map<string, any>(productPricing.map((p: any) => [p.productId, p]))

        // Get category pricing for fallback
        const categoryIds = products.map(p => p.categoryId).filter(Boolean) as string[]
        const categoryPricing = await (prisma as any).tierPricing.findMany({
            where: {
                organizationId,
                categoryId: { in: categoryIds },
                productId: null,
                isActive: true
            }
        })
        const categoryPricingMap = new Map<string, any>(categoryPricing.map((p: any) => [p.categoryId, p]))

        // Calculate prices
        const pricing = products.map(product => {
            const mrp = product.markedPrice || product.unitPrice || 0
            let discountPercent = 0
            let source = 'DEFAULT'

            // Product-level pricing first
            const prodPricing = productPricingMap.get(product.id)
            if (prodPricing) {
                source = 'PRODUCT'
                discountPercent = customerTier === 'VENDOR' ? prodPricing.vendorDiscount
                    : customerTier === 'RETAILER' ? prodPricing.retailerDiscount
                        : prodPricing.customerDiscount
            }
            // Category-level fallback
            else if (product.categoryId) {
                const catPricing = categoryPricingMap.get(product.categoryId)
                if (catPricing) {
                    source = 'CATEGORY'
                    discountPercent = customerTier === 'VENDOR' ? catPricing.vendorDiscount
                        : customerTier === 'RETAILER' ? catPricing.retailerDiscount
                            : catPricing.customerDiscount
                }
            }

            const discountAmount = (mrp * discountPercent) / 100
            const finalPrice = Math.round((mrp - discountAmount) * 100) / 100

            return {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                mrp,
                discountPercent,
                discountAmount: Math.round(discountAmount * 100) / 100,
                finalPrice,
                tier: customerTier,
                source
            }
        })

        return NextResponse.json({ customerTier, pricing })
    } catch (error) {
        console.error('Error calculating pricing:', error)
        return NextResponse.json({ error: 'Failed to calculate pricing' }, { status: 500 })
    }
}
