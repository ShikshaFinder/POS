'use client'

import { Printer, Store, Phone } from 'lucide-react'
import { format } from 'date-fns'

interface ReceiptItem {
    productName: string
    quantity: number
    unitPrice: number
    discountAmount: number
    total: number
}

interface ReceiptData {
    receiptNumber: string
    transactionDate: string
    customerName?: string
    customerPhone?: string
    items: ReceiptItem[]
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    paymentMethod: string
    amountPaid: number
    changeGiven: number
    cashierName?: string
}

interface OrganizationInfo {
    name: string
    address?: string
    phone?: string
    gstNumber?: string
}

interface ReceiptPreviewProps {
    receipt: ReceiptData
    organization: OrganizationInfo
    onPrint?: () => void
}

export default function ReceiptPreview({
    receipt,
    organization,
    onPrint
}: ReceiptPreviewProps) {
    const formatPaymentMethod = (method: string) => {
        const methods: Record<string, string> = {
            CASH: 'Cash',
            CARD: 'Card',
            UPI: 'UPI',
            WALLET: 'Wallet',
            SPLIT: 'Split Payment'
        }
        return methods[method] || method
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Print Button */}
            {onPrint && (
                <div className="p-3 border-b border-gray-200 flex justify-end">
                    <button
                        onClick={onPrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </button>
                </div>
            )}

            {/* Receipt Content - Thermal Printer Style */}
            <div className="p-6 font-mono text-sm" id="receipt-content">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="flex justify-center mb-2">
                        <Store className="h-8 w-8 text-gray-700" />
                    </div>
                    <h2 className="text-lg font-bold">{organization.name}</h2>
                    {organization.address && (
                        <p className="text-xs text-gray-600">{organization.address}</p>
                    )}
                    {organization.phone && (
                        <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                            <Phone className="h-3 w-3" />
                            {organization.phone}
                        </p>
                    )}
                    {organization.gstNumber && (
                        <p className="text-xs text-gray-600">GSTIN: {organization.gstNumber}</p>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* Receipt Info */}
                <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                        <span>Receipt #:</span>
                        <span className="font-semibold">{receipt.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date:</span>
                        <span>{format(new Date(receipt.transactionDate), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    {receipt.customerName && receipt.customerName !== 'Walk-in Customer' && (
                        <div className="flex justify-between">
                            <span>Customer:</span>
                            <span>{receipt.customerName}</span>
                        </div>
                    )}
                    {receipt.cashierName && (
                        <div className="flex justify-between">
                            <span>Cashier:</span>
                            <span>{receipt.cashierName}</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* Items */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                        <span className="flex-1">Item</span>
                        <span className="w-12 text-right">Qty</span>
                        <span className="w-16 text-right">Rate</span>
                        <span className="w-16 text-right">Amount</span>
                    </div>
                    {receipt.items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                            <div className="flex justify-between">
                                <span className="flex-1 truncate">{item.productName}</span>
                                <span className="w-12 text-right">{item.quantity}</span>
                                <span className="w-16 text-right">₹{item.unitPrice.toFixed(2)}</span>
                                <span className="w-16 text-right">₹{item.total.toFixed(2)}</span>
                            </div>
                            {item.discountAmount > 0 && (
                                <div className="text-green-600 text-right">
                                    Discount: -₹{item.discountAmount.toFixed(2)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* Totals */}
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{receipt.subtotal.toFixed(2)}</span>
                    </div>
                    {receipt.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-₹{receipt.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {receipt.taxAmount > 0 && (
                        <div className="flex justify-between">
                            <span>Tax:</span>
                            <span>₹{receipt.taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-300">
                        <span>TOTAL:</span>
                        <span>₹{receipt.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* Payment Info */}
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span>Payment:</span>
                        <span>{formatPaymentMethod(receipt.paymentMethod)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Paid:</span>
                        <span>₹{receipt.amountPaid.toFixed(2)}</span>
                    </div>
                    {receipt.changeGiven > 0 && (
                        <div className="flex justify-between font-semibold">
                            <span>Change:</span>
                            <span>₹{receipt.changeGiven.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-400 my-3" />

                {/* Footer */}
                <div className="text-center text-xs text-gray-600 space-y-1">
                    <p>Thank you for your purchase!</p>
                    <p>Visit again soon</p>
                    {/* TODO: WhatsApp bill sending will be implemented here */}
                    {/* <p className="text-green-600">📱 Bill sent to WhatsApp</p> */}
                </div>

                {/* Barcode placeholder */}
                <div className="mt-4 text-center">
                    <div className="inline-block bg-gray-100 px-4 py-2 rounded text-xs text-gray-500">
                        ||||| {receipt.receiptNumber} |||||
                    </div>
                </div>
            </div>
        </div>
    )
}
