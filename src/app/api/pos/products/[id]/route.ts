import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/pos/products/[id] - Update a product
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = user.currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 401 })
    }

    const { id: productId } = await params

    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true, sku: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      name, sku, unitPrice, price, currentStock, stock,
      reorderLevel, lowStockThreshold, unit, category,
      description, barcode, taxPercentage, gstRate,
      isLooseItem, baseQuantity, baseUnit, smallestUnit,
      costPrice, expiryDate,
    } = body

    const resolvedPrice = unitPrice ?? price
    const resolvedStock = currentStock ?? stock
    const resolvedReorder = reorderLevel ?? lowStockThreshold

    if (resolvedPrice !== undefined && parseFloat(resolvedPrice) < 0) {
      return NextResponse.json({ error: 'Unit price cannot be negative' }, { status: 400 })
    }

    if (resolvedStock !== undefined && parseFloat(resolvedStock) < 0) {
      return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 })
    }

    if (sku && sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: { sku, organizationId, id: { not: productId } },
        select: { id: true },
      })
      if (skuExists) {
        return NextResponse.json(
          { error: `SKU "${sku}" already in use.` },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name: name.trim() }),
        ...(sku && { sku }),
        ...(resolvedPrice !== undefined && { unitPrice: parseFloat(resolvedPrice) }),
        ...(resolvedStock !== undefined && { currentStock: parseFloat(resolvedStock) }),
        ...(resolvedReorder !== undefined && { reorderLevel: parseFloat(resolvedReorder) }),
        ...(unit !== undefined && { unit }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(barcode !== undefined && { barcode }),
      },
      select: {
        id: true, name: true, sku: true,
        unitPrice: true, currentStock: true, reorderLevel: true,
        unit: true, category: true,
      },
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE /api/pos/products/[id] - Delete a product
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = user.currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 401 })
    }

    const { id: productId } = await params

    const existing = await prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id: productId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
