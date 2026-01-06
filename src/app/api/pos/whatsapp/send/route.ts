import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp-service';

/**
 * POST /api/pos/whatsapp/send - Send WhatsApp message
 * Can be used for manual sending or testing
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if WhatsApp is configured
        if (!isWhatsAppConfigured()) {
            return NextResponse.json(
                { error: 'WhatsApp API not configured. Please set environment variables.' },
                { status: 503 }
            );
        }

        const body = await req.json();
        const { phone, message, invoiceId, customerName } = body;

        if (!phone || !message) {
            return NextResponse.json(
                { error: 'Phone number and message are required' },
                { status: 400 }
            );
        }

        // Send message (async but we wait for first attempt result)
        const result = await sendWhatsAppMessage({
            phone,
            text: message,
            invoiceId,
            metadata: { customerName },
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'WhatsApp message sent successfully',
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Failed to send WhatsApp message',
                error: result.error,
            });
        }
    } catch (error: any) {
        console.error('WhatsApp send error:', error);
        return NextResponse.json(
            { error: 'Failed to send WhatsApp message', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/pos/whatsapp/send - Check WhatsApp configuration status
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            configured: isWhatsAppConfigured(),
            provider: 'BhashSMS',
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
