import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "Product Team <noreply@flavidairysolution.com>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY is not configured. Email would have been sent:",
      payload
    );
    return;
  }

  try {
    await resend.emails.send({
      from: emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  } catch (error) {
    console.error("[email] Failed to send email via Resend:", {
      payload,
      error,
    });
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${getAppBaseUrl()}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <h2>Verify your account</h2>
      <p>Click the button below to verify your email.</p>
      <p><a href="${verificationUrl}">Verify email</a></p>
      <p>If the button above does not work, copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset your password</h2>
      <p>We received a request to reset the password on your account.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>${resetUrl}</p>
    `,
  });
}

// Receipt Email Types
interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
}

interface ReceiptEmailData {
  receiptNumber: string;
  transactionDate: Date;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  amountPaid: number;
  changeGiven: number;
  organizationName: string;
  organizationPhone?: string;
  organizationAddress?: string;
  organizationGst?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    CASH: 'Cash',
    CARD: 'Card',
    UPI: 'UPI',
    WALLET: 'Wallet',
    SPLIT: 'Split Payment',
  };
  return methods[method] || method;
}

export async function sendReceiptEmail(email: string, receipt: ReceiptEmailData) {
  const transactionDate = new Date(receipt.transactionDate).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemsHtml = receipt.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
      ${
        item.discountAmount > 0
          ? `<tr><td colspan="4" style="padding: 4px 8px; color: #16a34a; text-align: right; font-size: 12px;">Discount: -${formatCurrency(item.discountAmount)}</td></tr>`
          : ''
      }
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt from ${receipt.organizationName}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${receipt.organizationName}</h1>
          ${receipt.organizationAddress ? `<p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px;">${receipt.organizationAddress}</p>` : ''}
          ${receipt.organizationPhone ? `<p style="color: #dbeafe; margin: 4px 0 0 0; font-size: 14px;">Phone: ${receipt.organizationPhone}</p>` : ''}
          ${receipt.organizationGst ? `<p style="color: #dbeafe; margin: 4px 0 0 0; font-size: 14px;">GSTIN: ${receipt.organizationGst}</p>` : ''}
        </div>

        <!-- Receipt Info -->
        <div style="padding: 24px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Receipt Number</span>
              <span style="font-weight: 600; color: #111827;">${receipt.receiptNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Date & Time</span>
              <span style="color: #111827;">${transactionDate}</span>
            </div>
            ${
              receipt.customerName
                ? `<div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280; font-size: 14px;">Customer</span>
                    <span style="color: #111827;">${receipt.customerName}</span>
                  </div>`
                : ''
            }
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Item</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; font-size: 14px;">Qty</th>
                <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Rate</th>
                <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="color: #111827;">${formatCurrency(receipt.subtotal)}</span>
            </div>
            ${
              receipt.discountAmount > 0
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #16a34a;">Discount</span>
                    <span style="color: #16a34a;">-${formatCurrency(receipt.discountAmount)}</span>
                  </div>`
                : ''
            }
            ${
              receipt.taxAmount > 0
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6b7280;">Tax</span>
                    <span style="color: #111827;">${formatCurrency(receipt.taxAmount)}</span>
                  </div>`
                : ''
            }
            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb; margin-top: 12px;">
              <span style="font-size: 18px; font-weight: 700; color: #111827;">Total</span>
              <span style="font-size: 18px; font-weight: 700; color: #16a34a;">${formatCurrency(receipt.totalAmount)}</span>
            </div>
          </div>

          <!-- Payment Info -->
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #166534;">Payment Method</span>
              <span style="font-weight: 600; color: #166534;">${formatPaymentMethod(receipt.paymentMethod)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #166534;">Amount Paid</span>
              <span style="color: #166534;">${formatCurrency(receipt.amountPaid)}</span>
            </div>
            ${
              receipt.changeGiven > 0
                ? `<div style="display: flex; justify-content: space-between;">
                    <span style="color: #166534;">Change</span>
                    <span style="font-weight: 600; color: #166534;">${formatCurrency(receipt.changeGiven)}</span>
                  </div>`
                : ''
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Thank you for your purchase!</p>
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">This is an electronically generated receipt.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Receipt #${receipt.receiptNumber} from ${receipt.organizationName}`,
    html,
  });
}


