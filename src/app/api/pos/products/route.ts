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
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')

    // Fetch products with images and enhanced data
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        // Only show products with stock > 0 or all if no filter
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(categoryId && { categoryId })
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        markedPrice: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        category: true,
        categoryId: true,
        images: {
          take: 1,
          select: {
            url: true
          }
        },
        productCategory: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { currentStock: 'desc' }, // In-stock items first
        { name: 'asc' }
      ]
    })

    // Transform to include imageUrl
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      markedPrice: product.markedPrice,
      currentStock: product.currentStock,
      reorderLevel: product.reorderLevel,
      unit: product.unit,
      category: product.productCategory?.name || product.category,
      categoryId: product.categoryId || product.productCategory?.id,
      imageUrl: product.images?.[0]?.url || null
    }))

    return NextResponse.json({ products: transformedProducts })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
