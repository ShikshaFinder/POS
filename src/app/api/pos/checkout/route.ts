import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInvoiceNotification } from '@/lib/whatsapp-service'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    const body = await req.json()
    
    // Support both old format (direct ) and new format (nested objects from billing page)
    const items = body.items
    const customerName = body.customer?.name || body.customerName
    const customerPhone = body.customer?.phone || body.customerPhone
    const deliveryDate = body.deliveryDate
    
    // Extract totals - support both formats
    const totalAmount = body.totals?.total || body.totalAmount
    const subtotalAmount = body.totals?.subtotal
    const taxAmount = body.totals?.taxAmount
    
    // Extract payment details
    const paymentMethod = body.payment?.method || body.paymentMethod || 'CASH'
    const amountPaid = body.payment?.amountPaid || body.amountPaid || totalAmount
    const changeGiven = body.payment?.changeGiven || 0
    const cashAmount = body.payment?.cashAmount
    const cardAmount = body.payment?.cardAmount
    const upiAmount = body.payment?.upiAmount
    const walletAmount = body.payment?.walletAmount
    const roundOff = body.payment?.roundOff || 0
    const notes = body.payment?.notes || body.notes
    
    // Extract discount info
    const billDiscount = body.billDiscount || 0
    const billDiscountType = body.billDiscountType || 'flat'
    const couponCode = body.couponCode
    const couponDiscount = body.couponDiscount || 0
    const taxPercent = body.taxPercent || 0

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Validate all products and stock outside the transaction (simple, reliable)
    const processedItems: any[] = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      }
      if ((product.currentStock ?? 0) < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }
      const itemPrice = item.price || item.unitPrice || product.unitPrice || 0;
      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        product: product
      });
    }

    // Start a simple transaction for DB writes only
    const result = await prisma.$transaction(async (tx) => {

      // Create invoice/order
      const invoiceNumber = `INV-${Date.now()}`

      // For POS, we'll create a sales order and invoice
      // First, create or get walk-in customer connection
      let connection = await tx.connection.findFirst({
        where: {
          organizationId,
          name: customerName || 'Walk-in Customer',
          type: 'CUSTOMER'
        }
      })

      if (!connection && customerName) {
        connection = await tx.connection.create({
          data: {
            organizationId,
            name: customerName,
            type: 'CUSTOMER',
            businessCategory: 'RETAIL',
            contacts: customerPhone ? {
              create: {
                fullName: customerName,
                phone: customerPhone,
                isPrimary: true
              }
            } : undefined
          }
        })
      }

      // Create sales order
      const orderRef = `SO-${Date.now()}`

      // Ensure we have a connection (required by schema)
      if (!connection) {
        throw new Error('Customer connection is required')
      }

      const salesOrder = await tx.salesOrder.create({
        data: {
          organizationId,
          orderRef,
          connectionId: connection.id,
          stage: 'COMPLETED',
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          items: {
            create: processedItems.map((item: any) => ({
              organizationId,
              productId: item.productId,
              qty: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          salesOrderId: salesOrder.id,
          totalAmount: totalAmount,
          paidAmount: amountPaid,
          status: amountPaid >= totalAmount ? 'PAID' : 'PARTIALLY_PAID',
          approvalStatus: 'APPROVED',
          customerName: customerName || 'Walk-in Customer'
        }
      })

      // Create payment record(s) based on payment method
      const paymentData: any = {
        organizationId,
        invoiceId: invoice.id,
        amount: amountPaid,
        method: paymentMethod,
        paidAt: new Date(),
        status: 'COMPLETED'
      }
      
      // Add split payment details if available
      if (cashAmount) paymentData.cashAmount = cashAmount
      if (cardAmount) paymentData.cardAmount = cardAmount
      if (upiAmount) paymentData.upiAmount = upiAmount
      if (walletAmount) paymentData.walletAmount = walletAmount
      if (notes) paymentData.notes = notes
      
      await tx.payment.create({
        data: paymentData
      })

      // Update stock and create inventory transaction for each item (simple, sequential)
      for (const item of processedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        });
        // Create inventory transaction if stock exists
        const stock = await tx.inventoryStock.findFirst({
          where: {
            organizationId,
            productId: item.productId
          }
        });
        if (stock) {
          await tx.inventoryTransaction.create({
            data: {
              organizationId,
              stockId: stock.id,
              type: 'OUT',
              qty: item.quantity,
              referenceType: 'SalesOrder',
              referenceId: salesOrder.id
            }
          });
        }
      }
      return { salesOrder, invoice };
    });

    // 🔔 Send WhatsApp notification with PDF invoice (async - non-blocking)
    if (customerPhone) {
      // Get POS location for store info
      const posLocation = await prisma.pOSLocation.findFirst({
        where: { organizationId },
        select: { name: true, address: true, contactPhone: true }
      });

      // Generate and upload PDF invoice in background
      const sendNotificationWithPDF = async () => {
        let pdfUrl: string | undefined;

        try {
          // Dynamic import to avoid build issues if modules missing
          const { generateInvoiceHTML, buildInvoiceData } = await import('@/lib/invoice-generator');
          const { uploadInvoicePDF, isAzureStorageConfigured } = await import('@/lib/azure-blob');

          if (isAzureStorageConfigured()) {
            // Build invoice data
            const invoiceData = buildInvoiceData({
              invoice: result.invoice,
              items: result.salesOrder.items.map((item: any) => ({
                product: item.product,
                qty: item.qty,
                price: item.price
              })),
              posLocation,
              customer: { name: customerName, phone: customerPhone }
            });

            // Generate HTML and convert to PDF buffer
            const html = generateInvoiceHTML(invoiceData);
            const pdfBuffer = Buffer.from(html, 'utf-8');

            // Upload to Azure
            pdfUrl = await uploadInvoicePDF(pdfBuffer, organizationId, result.invoice.invoiceNumber);
            console.log('[Invoice] PDF uploaded:', pdfUrl);
          }
        } catch (err) {
          console.error('[Invoice] PDF generation/upload failed:', err);
          // Continue without PDF - WhatsApp will be sent without link
        }

        // Send WhatsApp with or without PDF URL
        sendInvoiceNotification({
          customerName: customerName || 'Valued Customer',
          customerPhone,
          invoiceNumber: result.invoice.invoiceNumber,
          amount: totalAmount,
          invoiceDate: new Date(),
          storeName: posLocation?.name || 'Our Store',
          invoiceId: result.invoice.id,
          pdfUrl,
        });
      };

      // Fire and forget
      sendNotificationWithPDF().catch(console.error);
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.invoice.id,
        receiptNumber: result.invoice.invoiceNumber,
        salesOrderId: result.salesOrder.id,
        invoiceId: result.invoice.id
      },
      orderId: result.salesOrder.id,
      invoiceNumber: result.invoice.invoiceNumber,
      receiptNumber: result.invoice.invoiceNumber, // For syncManager compatibility
      whatsAppSent: !!customerPhone, // Indicates if WhatsApp notification was triggered
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
