import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId

        // Get product categories with product counts
        const categories = await prisma.productCategory.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Also get products grouped by legacy category field for backward compatibility
        const legacyCategories = await prisma.product.groupBy({
            by: ['category'],
            where: {
                organizationId,
                categoryId: null // Only products without new category
            },
            _count: { id: true }
        })

        // Transform data
        const transformedCategories = [
            ...categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                productCount: cat._count.products
            })),
            ...legacyCategories
                .filter(cat => cat.category) // Filter out nulls
                .map(cat => ({
                    id: `legacy_${cat.category}`,
                    name: cat.category,
                    productCount: cat._count.id
                }))
        ]

        return NextResponse.json({ categories: transformedCategories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}
