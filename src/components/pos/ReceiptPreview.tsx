'use client'

import { Store, Phone } from 'lucide-react'
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
        <div className="bg-white">
            {/* Receipt Content - Thermal Printer Style */}
            <div className="p-4 sm:p-6 font-mono text-sm" id="receipt-content">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="flex justify-center mb-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Store className="h-6 w-6 text-gray-700" />
                        </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{organization.name}</h2>
                    {organization.address && (
                        <p className="text-xs text-gray-600 mt-1">{organization.address}</p>
                    )}
                    {organization.phone && (
                        <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {organization.phone}
                        </p>
                    )}
                    {organization.gstNumber && (
                        <p className="text-xs text-gray-500 mt-1">GSTIN: {organization.gstNumber}</p>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-gray-300 my-4" />

                {/* Receipt Info */}
                <div className="text-xs space-y-2 bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Receipt #:</span>
                        <span className="font-bold text-gray-900">{receipt.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="text-gray-900">{format(new Date(receipt.transactionDate), 'dd/MM/yyyy hh:mm a')}</span>
                    </div>
                    {receipt.customerName && receipt.customerName !== 'Walk-in Customer' && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Customer:</span>
                            <span className="text-gray-900">{receipt.customerName}</span>
                        </div>
                    )}
                    {receipt.cashierName && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Cashier:</span>
                            <span className="text-gray-900">{receipt.cashierName}</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-gray-300 my-4" />

                {/* Items Header */}
                <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-600 mb-2 px-1">
                    <span className="col-span-5">Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Rate</span>
                    <span className="col-span-3 text-right">Amount</span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                    {receipt.items.map((item, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 rounded-lg p-2">
                            <div className="grid grid-cols-12 gap-1 items-center">
                                <span className="col-span-5 font-medium text-gray-900 truncate" title={item.productName}>
                                    {item.productName}
                                </span>
                                <span className="col-span-2 text-center text-gray-700">{item.quantity}</span>
                                <span className="col-span-2 text-right text-gray-700">₹{item.unitPrice.toFixed(0)}</span>
                                <span className="col-span-3 text-right font-semibold text-gray-900">₹{item.total.toFixed(2)}</span>
                            </div>
                            {item.discountAmount > 0 && (
                                <div className="text-green-600 text-right mt-1 text-[10px]">
                                    Discount: -₹{item.discountAmount.toFixed(2)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-gray-300 my-4" />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
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
                        <div className="flex justify-between text-gray-600">
                            <span>Tax:</span>
                            <span>₹{receipt.taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-900">
                        <span>TOTAL:</span>
                        <span>₹{receipt.totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-gray-300 my-4" />

                {/* Payment Info */}
                <div className="bg-green-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Payment:</span>
                        <span className="font-medium text-gray-900">{formatPaymentMethod(receipt.paymentMethod)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium text-gray-900">₹{receipt.amountPaid.toFixed(2)}</span>
                    </div>
                    {receipt.changeGiven > 0 && (
                        <div className="flex justify-between font-semibold text-green-700">
                            <span>Change:</span>
                            <span>₹{receipt.changeGiven.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 space-y-1 mt-6">
                    <p className="text-base">🙏</p>
                    <p className="font-medium text-gray-700">Thank you for your purchase!</p>
                    <p>Visit again soon</p>
                </div>

                {/* Barcode */}
                <div className="mt-4 text-center">
                    <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                        <div className="text-xs font-mono text-gray-400 tracking-widest">
                            ||||| {receipt.receiptNumber} |||||
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
