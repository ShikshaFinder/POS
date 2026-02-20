import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testCheckout() {
    const payload = {
        items: [],
        customerName: 'Test Walkin',
        paymentMethod: 'CASH',
        totalAmount: 100,
        amountPaid: 100
    };

    try {
        const product = await prisma.product.findFirst({
            where: { currentStock: { gt: 0 } },
            select: { id: true, currentStock: true, name: true, organizationId: true, unitPrice: true, gstRate: true }
        });

        if (!product) {
            console.error('No product with stock found to test!');
            await prisma.$disconnect();
            return;
        }
        console.log('Testing with product:', product.name, 'Stock:', product.currentStock);

        payload.items = [{ productId: product.id, quantity: 1, price: product.unitPrice || 10, taxRate: product.gstRate || 0 }] as any;

        const user = await prisma.user.findFirst({
            where: { organizationId: product.organizationId, role: { in: ['OWNER', 'ADMIN'] } }
        });

        if (!user) {
            console.error('No suitable user found.');
            await prisma.$disconnect();
            return;
        }
        console.log('Running test as user:', user.email);

        const response = await fetch('http://localhost:3001/api/pos/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // WARNING: The API route expects getServerSession, so an external fetch won't work
                // unless we bypass auth or use a real cookie.
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

    } catch (err) {
        console.error('Error in script:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testCheckout();
