
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

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedPOSLocations: { take: 1 } }
    });

    const posLocationId = (session.user as any).posLocationId || user?.ownedPOSLocations?.[0]?.id;
    const posType = (session.user as any).posType;

    const organizationId = (session.user as any).currentOrganizationId
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const categoryName = searchParams.get('category')

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
        ...(categoryId && { categoryId }),
        ...(categoryName && {
          OR: [
            { category: { equals: categoryName, mode: 'insensitive' } },
            { productCategory: { name: { equals: categoryName, mode: 'insensitive' } } }
          ]
        })
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        markedPrice: true,
        currentStock: true, // Organization stock
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
        },
        // Include POS stock if location is available and NOT Dairy Associated (or fallback)
        ...(posLocationId && posType !== 'DAIRY_ASSOCIATED' && {
          posStock: {
            where: { posLocationId },
            select: { currentStock: true }
          }
        }),
        // Include Inventory Stocks for Dairy Associated
        ...(posType === 'DAIRY_ASSOCIATED' && {
          inventoryStocks: {
            select: { quantity: true }
          }
        })
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Transform to include imageUrl and correct stock
    const transformedProducts = products.map(product => {
      // Calculate effective stock based on POS location/type
      let effectiveStock = 0;

      if (posType === 'DAIRY_ASSOCIATED') {
        // Sum up all inventory stocks (Main Warehouse)
        effectiveStock = (product as any).inventoryStocks?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || 0;
      } else if (posLocationId && (product as any).posStock && (product as any).posStock.length > 0) {
        // Use Local POS Stock
        effectiveStock = (product as any).posStock[0].currentStock;
      } else {
        // Fallback
        effectiveStock = 0;
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        markedPrice: product.markedPrice,
        currentStock: effectiveStock,
        reorderLevel: product.reorderLevel,
        unit: product.unit,
        category: product.productCategory?.name || product.category,
        categoryId: product.categoryId || product.productCategory?.id,
        gstRate: 0,
        imageUrl: product.images?.[0]?.url || null
      };
    })

    // Sort by stock locally since we modified the values
    const sortedProducts = transformedProducts.sort((a, b) => b.currentStock - a.currentStock);

    return NextResponse.json({ products: sortedProducts })
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

    // Validate stock is not negative
    if (currentStock && parseFloat(currentStock) < 0) {
      return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 })
    }

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

    // Validate unit price is not negative
    if (unitPrice && parseFloat(unitPrice) < 0) {
      return NextResponse.json({ error: 'Unit price cannot be negative' }, { status: 400 })
    }

    // Validate stock is not negative
    if (currentStock && parseFloat(currentStock) < 0) {
      return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 })
    }

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

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}
