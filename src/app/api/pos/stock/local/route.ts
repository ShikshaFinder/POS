
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedPOSLocations: { take: 1 } }
        });

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 });
        }

        const posLocationId = user.ownedPOSLocations[0].id;
        const organizationId = (session.user as any).currentOrganizationId;

        // 1. Fetch all products for the organization
        const products = await prisma.product.findMany({
            where: {
                organizationId: organizationId,
                // Optional: Filter by specific categories if needed, but user said "all product and raw materials"
                // If Raw Materials are products, they will be included.
            },
            select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                category: true,
                markedPrice: true, // MRP for reference
                unitPrice: true,   // Selling Price
            }
        });

        // 2. Fetch current POS stock
        const currentStocks = await prisma.pOSProductStock.findMany({
            where: {
                posLocationId: posLocationId
            }
        });

        // 3. Map stock to products
        const stockMap = new Map(currentStocks.map(s => [s.productId, s]));

        const stockItems = products.map(product => {
            const stockEntry = stockMap.get(product.id);
            return {
                id: stockEntry?.id || `temp_${product.id}`, // specific stock ID or temp
                productId: product.id,
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '',
                    unit: product.unit,
                    category: product.category,
                    price: product.unitPrice || 0
                },
                currentStock: stockEntry?.currentStock || 0,
                minimumStock: stockEntry?.minimumStock || 10, // Default defaults
                reorderQuantity: stockEntry?.reorderQuantity || 50,
                lastStockUpdate: stockEntry?.lastStockUpdate || new Date()
            };
        });

        return NextResponse.json({ stock: stockItems });

    } catch (error) {
        console.error('Error fetching API local stock:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
