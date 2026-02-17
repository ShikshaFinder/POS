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

    // Support both old format (direct) and new format (nested objects from billing page)
    const items = body.items
    const customerName = body.customer?.name || body.customerName
    const customerPhone = body.customer?.phone || body.customerPhone
    const deliveryDate = body.deliveryDate

    // Extract totals - support both formats
    // Calculate total from items if not provided
    let totalAmount = body.totals?.total || body.totalAmount
    const subtotalAmount = body.totals?.subtotal
    const taxAmount = body.totals?.taxAmount

    // Extract payment details
    const paymentMethod = body.payment?.method || body.paymentMethod || 'CASH'
    let amountPaid = body.payment?.amountPaid || body.amountPaid
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

    const toNonNegativeNumber = (value: unknown, fallback = 0) => {
      const parsed = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
    }

    // Validate all products and stock outside the transaction (simple, reliable)
    const processedItems: any[] = [];
    let calculatedSubtotal = 0;
    let calculatedTaxAmount = 0;

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
      const itemTotal = itemPrice * item.quantity;

      const productTaxRate = toNonNegativeNumber((product as any).gstRate, taxPercent)
      const itemTaxRate = toNonNegativeNumber(item.taxRate ?? item.gstRate, productTaxRate)
      const itemTaxAmount = itemTotal * (itemTaxRate / 100)

      calculatedSubtotal += itemTotal;
      calculatedTaxAmount += itemTaxAmount;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        taxRate: itemTaxRate,
        product: product
      });
    }

    // Use calculated total if not provided
    if (!totalAmount) {
      totalAmount = calculatedSubtotal + calculatedTaxAmount;
    }

    // Default amountPaid to totalAmount if not provided
    if (!amountPaid) {
      amountPaid = totalAmount;
    }

    // Start a simple transaction for DB writes only
    // Increased timeout to 30 seconds for large orders with many items
    const result = await prisma.$transaction(async (tx) => {

      // Create invoice/order
      const invoiceNumber = `INV-${Date.now()}`

      // For POS, we'll create a sales order and invoice
      // First, create or get walk-in customer connection
      const connectionName = customerName || 'Walk-in Customer'

      let connection = await tx.connection.findFirst({
        where: {
          organizationId,
          name: connectionName,
          type: 'CUSTOMER'
        }
      })

      // Always create connection if not found (for walk-in customers too)
      if (!connection) {
        connection = await tx.connection.create({
          data: {
            organizationId,
            name: connectionName,
            type: 'CUSTOMER',
            businessCategory: 'RETAIL',
            contacts: customerPhone ? {
              create: {
                fullName: connectionName,
                phone: customerPhone,
                isPrimary: true
              }
            } : undefined
          }
        })
      }

      // Create sales order
      const orderRef = `SO-${Date.now()}`

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
      // Store split payment details in referenceNo as JSON if needed
      let referenceNo: string | undefined
      if (cashAmount || cardAmount || upiAmount || walletAmount) {
        referenceNo = JSON.stringify({
          cashAmount,
          cardAmount,
          upiAmount,
          walletAmount,
          notes
        })
      }

      await tx.payment.create({
        data: {
          organizationId,
          invoiceId: invoice.id,
          amount: amountPaid,
          method: paymentMethod,
          paidAt: new Date(),
          status: 'COMPLETED',
          referenceNo
        }
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
    }, {
      timeout: 30000, // 30 seconds timeout for large orders
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
