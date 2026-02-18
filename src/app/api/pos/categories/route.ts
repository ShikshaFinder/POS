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

        // 1. Get all product categories
        const categories = await prisma.productCategory.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: 'asc' }
        })

        // 2. Get all unique legacy category names from products
        const products = await prisma.product.findMany({
            where: { organizationId },
            select: {
                id: true,
                category: true,
                categoryId: true
            }
        })

        // 3. Map to store counts
        const categoryCounts = new Map<string, number>()
        const legacyCounts = new Map<string, number>()

        // 4. Calculate counts
        products.forEach(product => {
            if (product.categoryId) {
                // Count by explicit link
                categoryCounts.set(product.categoryId, (categoryCounts.get(product.categoryId) || 0) + 1)
            } else if (product.category) {
                // If not linked, check if the string matches a ProductCategory name
                const matchingCategory = categories.find(c => c.name.toLowerCase() === product.category!.toLowerCase())
                if (matchingCategory) {
                    categoryCounts.set(matchingCategory.id, (categoryCounts.get(matchingCategory.id) || 0) + 1)
                } else {
                    // It's a true legacy category (no matching ProductCategory)
                    legacyCounts.set(product.category, (legacyCounts.get(product.category) || 0) + 1)
                }
            }
        })

        // 5. Transform data - combine ProductCategory entries with true legacy counts
        const transformedCategories = [
            ...categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
                productCount: categoryCounts.get(cat.id) || 0
            })),
            // Add legacy categories that don't match any ProductCategory name
            ...Array.from(legacyCounts.entries()).map(([name, count]) => ({
                id: `legacy_${name}`,
                name: name,
                productCount: count
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
