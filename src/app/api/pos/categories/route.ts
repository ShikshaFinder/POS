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

        // Also get unique category names from the legacy category field on all products
        const legacyCategories = await prisma.product.groupBy({
            by: ['category'],
            where: {
                organizationId
            },
            _count: { id: true }
        })

        // Get category names from ProductCategory to filter out duplicates
        const productCategoryNames = new Set(categories.map(c => c.name.toLowerCase()))

        // Transform data - combine ProductCategory entries with legacy product.category values
        const transformedCategories = [
            ...categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
                productCount: cat._count.products
            })),
            // Add legacy categories that don't exist in ProductCategory
            ...legacyCategories
                .filter((cat) => cat.category && !productCategoryNames.has(cat.category.toLowerCase()))
                .map((cat) => ({
                    id: `legacy_${cat.category}`,
                    name: cat.category!,
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
