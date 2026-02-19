import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { sendInvoiceNotification } from '../../../../lib/whatsapp-service'

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

    const roundMoney = (value: number) => Math.round(value * 100) / 100

    // Start a transaction that includes stock validation + DB writes
    // This prevents race conditions where concurrent requests oversell stock
    // Increased timeout to 30 seconds for large orders with many items
    const result = await prisma.$transaction(async (tx) => {

      // Validate all products and stock INSIDE the transaction
      const processedItems: any[] = [];
      let calculatedSubtotal = 0;
      let calculatedTaxAmount = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if ((product.currentStock ?? 0) < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const itemPrice = item.price || item.unitPrice || product.unitPrice || 0;
        const itemDiscount = toNonNegativeNumber(item.discountAmount ?? item.discount, 0);
        const itemTotal = itemPrice * item.quantity;
        const itemNetTotal = itemTotal - itemDiscount;

        const productTaxRate = toNonNegativeNumber((product as any).gstRate, taxPercent)
        const itemTaxRate = toNonNegativeNumber(item.taxRate ?? item.gstRate, productTaxRate)
        const itemTaxAmount = roundMoney(itemNetTotal * (itemTaxRate / 100))

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
        totalAmount = roundMoney(calculatedSubtotal + calculatedTaxAmount);
      }

      // Default amountPaid to totalAmount only if not explicitly provided (including 0)
      if (amountPaid === undefined || amountPaid === null) {
        amountPaid = totalAmount;
      }

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
          connectionId: connection!.id,
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
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          },
          select: {
            id: true,
            name: true,
            currentStock: true,
            reorderLevel: true
          }
        });

        // 🔔 Create notification if stock falls below reorder level
        if ((updatedProduct.currentStock ?? 0) <= (updatedProduct.reorderLevel || 0)) {
          const { createNotification } = await import('../../../../lib/notifications');
          const sessionEmail = (session.user as any).email;
          const userId = (session.user as any).id || (sessionEmail ? (await tx.user.findUnique({
            where: { email: sessionEmail },
            select: { id: true }
          }))?.id : undefined);

          await createNotification({
            organizationId,
            userId: userId as string,
            title: 'Low Stock Alert',
            body: `${updatedProduct.name} is running low (${updatedProduct.currentStock} units left). Reorder level is ${updatedProduct.reorderLevel}.`,
            posAlertId: updatedProduct.id
          });
        }

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

      // Increment coupon usage count if a coupon was applied
      if (couponCode) {
        await (tx as any).pOSCouponCode.updateMany({
          where: {
            organizationId,
            code: couponCode.toUpperCase(),
          },
          data: {
            usageCount: { increment: 1 }
          }
        });
      }

      return { salesOrder, invoice };
    }, {
      timeout: 30000,
    });

    // 🔔 Create notification for successful sale
    try {
      let userId = (session.user as any).id;

      const sessionEmail = (session.user as any).email;
      if (!userId && sessionEmail) {
        console.log(`[Checkout] UserId missing, searching by email: ${sessionEmail}`);
        const user = await prisma.user.findUnique({
          where: { email: sessionEmail },
          select: { id: true }
        });
        if (user) {
          userId = user.id;
          console.log(`[Checkout] Found userId from DB: ${userId}`);
        }
      }

      console.log(`[Checkout] Triggering notification. Org: ${organizationId}, User: ${userId}`);

      const { createNotification } = await import('../../../../lib/notifications');
      const nf = await createNotification({
        organizationId,
        userId: userId as string,
        title: 'New Sale Completed',
        body: `Invoice ${result.invoice.invoiceNumber} for ${customerName || 'Walk-in Customer'} has been processed. Total: ₹${totalAmount}`,
        posInvoiceId: result.invoice.id
      });
      console.log(`[Checkout] Notification result: ${nf ? 'SUCCESS' : 'FAILED'}`);
    } catch (e: any) {
      console.error(`[Checkout] Notification error: ${e.message}`);
    }

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
          const { generateInvoiceHTML, buildInvoiceData } = await import('../../../../lib/invoice-generator');
          const { uploadInvoicePDF, isAzureStorageConfigured } = await import('../../../../lib/azure-blob');

          if (isAzureStorageConfigured()) {
            // Build invoice data
            const invoiceData = buildInvoiceData({
              invoice: result.invoice,
              items: result.salesOrder.items.map((item: any) => ({
                product: item.product,
                qty: item.qty,
                price: item.price
              })),
              posLocation: posLocation as any,
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
    // Return appropriate status codes for known validation errors
    const message = error.message || 'Failed to process checkout'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('Insufficient stock')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
