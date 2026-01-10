import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to generate a unique SKU
async function generateUniqueSKU(organizationId: string, name: string, category: string): Promise<string> {
  const prefix = category.substring(0, 3).toUpperCase()
  const namePart = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4)

  let sku = `${prefix}-${namePart}-${timestamp}`
  let counter = 0

  // Check for uniqueness
  while (true) {
    const existing = await prisma.product.findFirst({
      where: { sku, organizationId },
      select: { id: true }
    })

    if (!existing) break

    counter++
    sku = `${prefix}-${namePart}-${timestamp}${counter}`
  }

  return sku
}

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      sku,
      unitPrice,
      currentStock,
      reorderLevel,
      unit,
      category,
    } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    if (!unit) {
      return NextResponse.json({ error: 'Unit is required' }, { status: 400 })
    }

    // Generate unique SKU if not provided
    let productSKU = sku
    if (!productSKU || productSKU.trim() === '') {
      productSKU = await generateUniqueSKU(organizationId, name, category || 'GEN')
    } else {
      // Verify provided SKU is unique
      const existing = await prisma.product.findFirst({
        where: { sku: productSKU, organizationId },
        select: { id: true }
      })

      if (existing) {
        return NextResponse.json(
          { error: `SKU "${productSKU}" already exists. Please use a different SKU.` },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        name: name.trim(),
        sku: productSKU,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 0,
        unit,
        category: category || 'General',
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        category: true,
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

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Verify product exists and belongs to this organization
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true, sku: true }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      name,
      sku,
      unitPrice,
      currentStock,
      reorderLevel,
      unit,
      category,
    } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Check SKU uniqueness if changed
    if (sku && sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku, organizationId, id: { not: productId } },
        select: { id: true }
      })

      if (skuExists) {
        return NextResponse.json(
          { error: `SKU "${sku}" already exists. Please use a different SKU.` },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name.trim(),
        ...(sku && { sku }),
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentStock: currentStock ? parseFloat(currentStock) : 0,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 0,
        ...(unit && { unit }),
        ...(category && { category }),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        category: true,
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
