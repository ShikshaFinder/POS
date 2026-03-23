import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/pos/categories/[id] - Update a category
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateRequest(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = user.currentOrganizationId
        if (!organizationId) {
            return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
        }

        const { id } = await params
        const body = await req.json()
        const { name } = body

        const existing = await prisma.productCategory.findFirst({
            where: { id, organizationId },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        const updated = await prisma.productCategory.update({
            where: { id },
            data: { name: name?.trim() ?? existing.name },
            select: { id: true, name: true },
        })

        return NextResponse.json({ category: updated })
    } catch (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

// DELETE /api/pos/categories/[id] - Delete a category
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateRequest(req)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = user.currentOrganizationId
        if (!organizationId) {
            return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
        }

        const { id } = await params

        const existing = await prisma.productCategory.findFirst({
            where: { id, organizationId },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }

        // Unlink products from this category before deleting
        await prisma.product.updateMany({
            where: { categoryId: id, organizationId },
            data: { categoryId: null },
        })

        await prisma.productCategory.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }
}
