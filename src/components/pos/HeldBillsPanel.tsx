'use client'

import { Clock, Play, Trash2, ShoppingBag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { CartItem } from './CartPanel'

export interface HeldBill {
    id: string
    timestamp: Date
    items: CartItem[]
    customerName?: string
    total: number
}

interface HeldBillsPanelProps {
    bills: HeldBill[]
    onResume: (bill: HeldBill) => void
    onDelete: (billId: string) => void
    isOpen: boolean
    onClose: () => void
}

export default function HeldBillsPanel({
    bills,
    onResume,
    onDelete,
    isOpen,
    onClose
}: HeldBillsPanelProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Held Bills ({bills.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Close
                    </button>
                </div>

                {/* Bills List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {bills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <ShoppingBag className="h-12 w-12 mb-2" />
                            <p className="text-sm">No held bills</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bills.map((bill) => (
                                <div
                                    key={bill.id}
                                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {bill.customerName || 'Walk-in Customer'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    • {formatDistanceToNow(bill.timestamp, { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {bill.items.slice(0, 3).map((item, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded"
                                                    >
                                                        {item.name} ×{item.quantity}
                                                    </span>
                                                ))}
                                                {bill.items.length > 3 && (
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                        +{bill.items.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-semibold text-gray-900">
                                                ₹{bill.total.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                                        <button
                                            onClick={() => onResume(bill)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            <Play className="h-4 w-4" />
                                            Resume
                                        </button>
                                        <button
                                            onClick={() => onDelete(bill.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        Press F5 to hold current bill • F6 to view held bills
                    </p>
                </div>
            </div>
        </div>
    )
}
