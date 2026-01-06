/**
 * Invoice PDF Generator
 * Generates a simple HTML invoice and converts to PDF
 * Uses html-pdf-node or returns HTML for client-side rendering
 */

export interface InvoiceItem {
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    total: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    invoiceDate: Date;
    storeName: string;
    storeAddress?: string;
    storePhone?: string;
    storeGST?: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceItem[];
    subtotal: number;
    tax?: number;
    discount?: number;
    totalAmount: number;
    paymentMethod?: string;
    notes?: string;
}

/**
 * Format currency in INR
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format date
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Generate invoice HTML
 */
export function generateInvoiceHTML(data: InvoiceData): string {
    const itemsHTML = data.items.map((item, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong>
        ${item.sku ? `<br><small style="color: #666;">${item.sku}</small>` : ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .store-info h1 { margin: 0 0 10px 0; font-size: 24px; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
    .customer-section { margin-bottom: 30px; background: #f9fafb; padding: 15px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #333; color: white; padding: 10px; text-align: left; }
    .totals { float: right; width: 300px; }
    .totals table { margin-top: 20px; }
    .totals td { padding: 8px; }
    .totals .total-row { font-size: 18px; font-weight: bold; background: #f0f9ff; }
    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="store-info">
        <h1>${data.storeName}</h1>
        ${data.storeAddress ? `<p>${data.storeAddress}</p>` : ''}
        ${data.storePhone ? `<p>📞 ${data.storePhone}</p>` : ''}
        ${data.storeGST ? `<p>GSTIN: ${data.storeGST}</p>` : ''}
      </div>
      <div class="invoice-info">
        <div class="invoice-number">${data.invoiceNumber}</div>
        <p><strong>Date:</strong> ${formatDate(data.invoiceDate)}</p>
        ${data.paymentMethod ? `<p><strong>Payment:</strong> ${data.paymentMethod}</p>` : ''}
      </div>
    </div>

    <div class="customer-section">
      <strong>Bill To:</strong><br>
      ${data.customerName}<br>
      ${data.customerPhone ? `📞 ${data.customerPhone}<br>` : ''}
      ${data.customerAddress || ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Item</th>
          <th style="width: 80px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Price</th>
          <th style="width: 100px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">${formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.tax ? `
        <tr>
          <td>Tax:</td>
          <td style="text-align: right;">${formatCurrency(data.tax)}</td>
        </tr>
        ` : ''}
        ${data.discount ? `
        <tr>
          <td>Discount:</td>
          <td style="text-align: right;">-${formatCurrency(data.discount)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td><strong>Total:</strong></td>
          <td style="text-align: right;"><strong>${formatCurrency(data.totalAmount)}</strong></td>
        </tr>
      </table>
    </div>

    <div style="clear: both;"></div>

    ${data.notes ? `
    <div style="margin-top: 30px; padding: 15px; background: #fffbeb; border-radius: 8px;">
      <strong>Notes:</strong><br>
      ${data.notes}
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your purchase! 🙏</p>
      <p>This is a computer-generated invoice.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF buffer from HTML using Puppeteer (if available) or return HTML
 * Note: For serverless, consider using a PDF API service
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<{ buffer: Buffer; html: string }> {
    const html = generateInvoiceHTML(data);

    // For now, return HTML as a text buffer
    // In production, integrate with a PDF generation service like:
    // - Puppeteer (requires chrome)
    // - html-pdf-node
    // - External API (PDFShift, html2pdf.app, etc.)

    // Simple text-based PDF placeholder
    // Replace this with actual PDF generation in production
    const htmlBuffer = Buffer.from(html, 'utf-8');

    return { buffer: htmlBuffer, html };
}

/**
 * Get invoice data from database records
 */
export function buildInvoiceData(params: {
    invoice: any;
    items: Array<{ product: any; qty: number; price: number }>;
    posLocation: any;
    customer?: any;
}): InvoiceData {
    const { invoice, items, posLocation, customer } = params;

    return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt || Date.now()),
        storeName: posLocation?.name || 'Store',
        storeAddress: posLocation?.address,
        storePhone: posLocation?.contactPhone,
        customerName: customer?.name || invoice.customerName || 'Walk-in Customer',
        customerPhone: customer?.phone,
        items: items.map(item => ({
            name: item.product?.name || 'Product',
            sku: item.product?.sku,
            quantity: item.qty,
            price: item.price,
            total: item.qty * item.price,
        })),
        subtotal: invoice.totalAmount || items.reduce((sum, i) => sum + i.qty * i.price, 0),
        totalAmount: invoice.totalAmount,
        paymentMethod: 'Cash',
    };
}
