import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiptId, phone } = await req.json()

    if (!receiptId || !phone) {
      return NextResponse.json(
        { error: 'Receipt ID and phone number are required' },
        { status: 400 }
      )
    }

    // Fetch the receipt/invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: receiptId },
      include: {
        salesOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        payments: true
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Format the receipt message
    const items = invoice.salesOrder?.items || []
    const itemsList = items.map(item => 
      `• ${item.product.name} x${item.qty} - ₹${(item.price * item.qty).toFixed(2)}`
    ).join('\n')

    const payment = invoice.payments?.[0]
    const paymentMethod = payment?.method || 'N/A'

    const message = [
      `*Receipt #${invoice.invoiceNumber}*`,
      `Date: ${format(new Date(invoice.createdAt), 'dd MMM yyyy, hh:mm a')}`,
      '',
      '*Items:*',
      itemsList,
      '',
      `*Total: ₹${invoice.totalAmount.toFixed(2)}*`,
      `Payment: ${paymentMethod}`,
      `Paid: ₹${invoice.paidAmount.toFixed(2)}`,
      '',
      'Thank you for your purchase! 🙏',
    ].join('\n')

    // Try to send via WhatsApp Business API if configured
    const whatsappApiKey = process.env.WHATSAPP_API_KEY
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID

    if (whatsappApiKey && whatsappPhoneId) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: message }
            })
          }
        )

        if (response.ok) {
          return NextResponse.json({ 
            success: true, 
            message: 'Receipt sent via WhatsApp' 
          })
        }
      } catch (apiError) {
        console.error('WhatsApp API error:', apiError)
      }
    }

    // Fallback: Return the message for client-side WhatsApp Web redirect
    return NextResponse.json({
      success: false,
      fallback: true,
      message: message,
      phone: phone,
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    })

  } catch (error: any) {
    console.error('Send WhatsApp receipt error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send receipt' },
      { status: 500 }
    )
  }
}
