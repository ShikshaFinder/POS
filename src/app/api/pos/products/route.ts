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

// POST /api/pos/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await req.json()
    const { name, sku, unitPrice, currentStock, reorderLevel, unit, category } = body

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Check if SKU already exists (if provided)
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku }
      })
      if (existingProduct) {
        return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 400 })
      }
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        name,
        sku: sku || null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 0,
        unit: unit || 'PIECE',
        category: category || 'General'
      }
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}

// PUT /api/pos/products - Update an existing product
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await req.json()
    const { id, name, sku, unitPrice, currentStock, reorderLevel, unit, category } = body

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Verify product exists and belongs to the organization
    const existingProduct = await prisma.product.findFirst({
      where: { id, organizationId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if SKU already exists for another product (if changed)
    if (sku && sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku }
      })
      if (skuExists) {
        return NextResponse.json({ error: 'A product with this SKU already exists' }, { status: 400 })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku: sku || null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 0,
        unit: unit || 'PIECE',
        category: category || 'General'
      }
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}
