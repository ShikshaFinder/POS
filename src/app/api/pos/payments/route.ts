
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
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
        const body = await req.json();
        const { invoiceId, amount, paymentMethod, reference, notes } = body;

        if (!invoiceId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid invoice ID or amount' }, { status: 400 });
        }

        // Verify invoice exists and belongs to this POS
        const invoice = await prisma.pOSInvoice.findUnique({
            where: { id: invoiceId },
            include: { posLocation: true }
        });

        if (!invoice || invoice.posLocationId !== posLocationId) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status === 'PAID' && amount > 0) {
            return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
        }

        // Check overpayment
        if (amount > invoice.balanceAmount) {
            return NextResponse.json({ error: `Amount exceeds balance of ${invoice.balanceAmount}` }, { status: 400 });
        }

        // Create Payment
        const payment = await prisma.pOSPayment.create({
            data: {
                invoiceId,
                amount: parseFloat(amount),
                paymentMethod: paymentMethod || 'BANK_TRANSFER',
                reference,
                notes,
                paymentDate: new Date()
            }
        });

        // Update Invoice
        const newPaidAmount = invoice.paidAmount + parseFloat(amount);
        const newBalance = invoice.totalAmount - newPaidAmount;
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

        const updatedInvoice = await prisma.pOSInvoice.update({
            where: { id: invoiceId },
            data: {
                paidAmount: newPaidAmount,
                balanceAmount: newBalance,
                status: newStatus,
                paymentDate: new Date(),
                paymentMethod: paymentMethod || invoice.paymentMethod
            }
        });

        // Update POS Location Balance (Reduce debt)
        await prisma.pOSLocation.update({
            where: { id: posLocationId },
            data: {
                currentBalance: {
                    decrement: parseFloat(amount)
                }
            }
        });

        return NextResponse.json({ message: 'Payment recorded', payment, invoice: updatedInvoice });

    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}
