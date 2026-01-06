/**
 * WhatsApp Transactional Messaging Service
 * Provider: BhashSMS (https://bhashsms.com)
 * 
 * Features:
 * - Async/non-blocking execution
 * - Request/response logging
 * - Retry support with exponential backoff
 * - Extensible for future template APIs
 */

export interface WhatsAppMessagePayload {
    phone: string;
    text: string;
    invoiceId?: string;
    customerId?: string;
    metadata?: Record<string, any>;
}

export interface WhatsAppLogEntry {
    invoiceId?: string;
    phone: string;
    requestUrl?: string;
    responseBody?: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    timestamp: Date;
    retryCount?: number;
}

// Environment variables
const WHATSAPP_API_BASE_URL = process.env.WHATSAPP_API_BASE_URL || 'https://bhashsms.com/api/sendmsgutil.php';
const WHATSAPP_API_USER = process.env.WHATSAPP_API_USER;
const WHATSAPP_API_PASS = process.env.WHATSAPP_API_PASS;
const WHATSAPP_SENDER_ID = process.env.WHATSAPP_SENDER_ID;

/**
 * Check if WhatsApp API is configured
 */
export function isWhatsAppConfigured(): boolean {
    return !!(WHATSAPP_API_USER && WHATSAPP_API_PASS && WHATSAPP_SENDER_ID);
}

/**
 * Log WhatsApp message attempt (can be extended to store in DB)
 */
function logWhatsAppAttempt(entry: WhatsAppLogEntry): void {
    const logData = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
    };

    if (entry.status === 'success') {
        console.log('[WhatsApp] Message sent:', JSON.stringify(logData));
    } else {
        console.error('[WhatsApp] Message failed:', JSON.stringify(logData));
    }
}

/**
 * Build BhashSMS API URL with query parameters
 */
function buildApiUrl(phone: string, text: string): string {
    const params = new URLSearchParams({
        user: WHATSAPP_API_USER!,
        pass: WHATSAPP_API_PASS!,
        sender: WHATSAPP_SENDER_ID!,
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        text: text,
        priority: 'wa',
        stype: 'normal',
    });

    return `${WHATSAPP_API_BASE_URL}?${params.toString()}`;
}

/**
 * Send WhatsApp message via BhashSMS API
 * Non-blocking - fires and logs result
 */
export async function sendWhatsAppMessage(
    payload: WhatsAppMessagePayload,
    retryCount: number = 0
): Promise<{ success: boolean; error?: string }> {
    // Check configuration
    if (!isWhatsAppConfigured()) {
        console.warn('[WhatsApp] API not configured - skipping message');
        return { success: false, error: 'WhatsApp API not configured' };
    }

    // Validate phone number
    const cleanPhone = payload.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        logWhatsAppAttempt({
            invoiceId: payload.invoiceId,
            phone: payload.phone,
            status: 'failed',
            errorMessage: 'Invalid phone number',
            timestamp: new Date(),
        });
        return { success: false, error: 'Invalid phone number' };
    }

    // Ensure Indian phone format (add 91 if not present)
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const apiUrl = buildApiUrl(formattedPhone, payload.text);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(apiUrl, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();

        // BhashSMS typically returns a status in response
        const isSuccess = response.ok && !responseText.toLowerCase().includes('error');

        logWhatsAppAttempt({
            invoiceId: payload.invoiceId,
            phone: formattedPhone,
            requestUrl: apiUrl.replace(WHATSAPP_API_PASS!, '***'), // Mask password
            responseBody: responseText,
            status: isSuccess ? 'success' : 'failed',
            timestamp: new Date(),
            retryCount,
        });

        if (!isSuccess && retryCount < 2) {
            // Retry with exponential backoff
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            setTimeout(() => {
                sendWhatsAppMessage(payload, retryCount + 1).catch(() => { });
            }, delay);
        }

        return { success: isSuccess, error: isSuccess ? undefined : responseText };
    } catch (error: any) {
        const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;

        logWhatsAppAttempt({
            invoiceId: payload.invoiceId,
            phone: formattedPhone,
            status: 'failed',
            errorMessage,
            timestamp: new Date(),
            retryCount,
        });

        // Retry on network errors
        if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
                sendWhatsAppMessage(payload, retryCount + 1).catch(() => { });
            }, delay);
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * Send invoice notification via WhatsApp (non-blocking)
 */
export function sendInvoiceNotification(params: {
    customerName: string;
    customerPhone: string;
    invoiceNumber: string;
    amount: number;
    invoiceDate: Date;
    storeName: string;
    invoiceId?: string;
    pdfUrl?: string; // Optional PDF download link
}): void {
    const { customerName, customerPhone, invoiceNumber, amount, invoiceDate, storeName, invoiceId, pdfUrl } = params;

    // Format date
    const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    // Format amount
    const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);

    // Build message from template
    let message = `Hello ${customerName},

Thank you for your purchase at ${storeName} 🙏

🧾 Invoice No: ${invoiceNumber}
💰 Amount: ${formattedAmount}
📅 Date: ${formattedDate}`;

    // Add PDF link if available
    if (pdfUrl) {
        message += `

📄 Download Invoice: ${pdfUrl}`;
    }

    message += `

We appreciate your visit.`;

    // Fire and forget - don't await
    sendWhatsAppMessage({
        phone: customerPhone,
        text: message,
        invoiceId,
        metadata: {
            customerName,
            invoiceNumber,
            amount,
            date: formattedDate,
            pdfUrl,
        },
    }).catch((err) => {
        console.error('[WhatsApp] Failed to send invoice notification:', err);
    });
}

// Export for future extensibility
export const WhatsAppService = {
    isConfigured: isWhatsAppConfigured,
    sendMessage: sendWhatsAppMessage,
    sendInvoiceNotification,
};
