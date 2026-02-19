
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { items } = await req.json(); // items: { productId, quantity }[]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items provided' }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedPOSLocations: { take: 1 } }
        });

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 });
        }

        const posLocation = user.ownedPOSLocations[0];
        // Use organizationId from the POS location record to ensure consistency with CRM
        const organizationId = posLocation.organizationId;
        // const organizationId = (session.user as any).currentOrganizationId;

        // Fetch products to get prices
        const productIds = items.map((i: any) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Calculate totals and prepare order items
        let subtotal = 0;
        const orderItemsData = items.map((item: any) => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
            }
            const unitPrice = product.unitPrice || 0; // Use selling price or cost price? Usually transfer price. Using unitPrice for now.
            const quantity = parseFloat(item.quantity);
            const totalPrice = unitPrice * quantity;
            subtotal += totalPrice;

            return {
                productId: item.productId,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
                discount: 0,
                taxRate: 0 // Assuming tax calculated elsewhere or 0 for internal
            };
        });

        // Generate Order Number
        const count = await prisma.pOSOrder.count({
            where: { organizationId }
        });
        const orderNumber = `POS-${posLocation.code}-${Date.now().toString().slice(-6)}-${count + 1}`;

        // Create POSOrder
        const posOrder = await prisma.pOSOrder.create({
            data: {
                organizationId,
                posLocationId: posLocation.id,
                orderNumber,
                status: 'PENDING', // Directly to PENDING so admin sees it
                creationType: 'MANUAL',
                createdById: userId,
                subtotal: subtotal,
                totalAmount: subtotal, // Add tax/discount logic if needed
                items: {
                    create: orderItemsData
                }
            }
        });

        return NextResponse.json({ message: 'Order placed successfully', order: posOrder });

    } catch (error) {
        console.error('Error creating POS order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
