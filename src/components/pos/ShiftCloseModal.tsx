'use client'

import { useState, useEffect } from 'react'
import { X, Clock, TrendingUp, TrendingDown, AlertCircle, Loader2, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Session {
    id: string
    sessionNumber: string
    openedAt: string
    openingBalance: number
    totalSales: number
    totalCash: number
    totalCard: number
    totalUpi: number
    transactionCount: number
}

interface ShiftCloseModalProps {
    isOpen: boolean
    onClose: () => void
    session: Session | null
    onShiftClosed: () => void
}

export default function ShiftCloseModal({
    isOpen,
    onClose,
    session,
    onShiftClosed
}: ShiftCloseModalProps) {
    const [loading, setLoading] = useState(false)
    const [actualCash, setActualCash] = useState('')
    const [notes, setNotes] = useState('')

    // Calculate expected cash
    const expectedCash = session
        ? session.openingBalance + session.totalCash
        : 0

    const actualCashNum = parseFloat(actualCash) || 0
    const cashDifference = actualCashNum - expectedCash

    useEffect(() => {
        if (isOpen && session) {
            setActualCash(String(expectedCash))
        }
    }, [isOpen, session, expectedCash])

    const handleCloseShift = async () => {
        if (!session) return

        setLoading(true)
        try {
            const res = await fetch('/api/pos/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: session.id,
                    actualCash: actualCashNum,
                    notes
                })
            })

            if (res.ok) {
                toast.success('Shift closed successfully')
                onShiftClosed()
                onClose()
            } else {
                const error = await res.json()
                toast.error(error.error || 'Failed to close shift')
            }
        } catch (error) {
            console.error('Close shift error:', error)
            toast.error('Failed to close shift')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !session) return null

    const shiftDuration = () => {
        const start = new Date(session.openedAt)
        const now = new Date()
        const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60))
        const minutes = Math.floor(((now.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Close Shift</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Shift Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Shift #{session.sessionNumber}</span>
                            <span className="text-sm text-gray-500">{shiftDuration()}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            ₹{session.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">Total Sales • {session.transactionCount} transactions</p>
                    </div>

                    {/* Payment Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-lg p-3 flex items-center gap-3">
                            <Banknote className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-xs text-green-600">Cash</p>
                                <p className="font-semibold text-green-700">₹{session.totalCash.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-xs text-blue-600">Card</p>
                                <p className="font-semibold text-blue-700">₹{session.totalCard.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 flex items-center gap-3">
                            <Smartphone className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-xs text-purple-600">UPI</p>
                                <p className="font-semibold text-purple-700">₹{(session.totalUpi || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cash Reconciliation */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <h3 className="font-medium text-gray-900">Cash Reconciliation</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Opening Balance</span>
                                <span className="font-medium">₹{session.openingBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">+ Cash Sales</span>
                                <span className="font-medium text-green-600">₹{session.totalCash.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-medium text-gray-900">Expected Cash</span>
                                <span className="font-bold">₹{expectedCash.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actual Cash Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Actual Cash in Drawer
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                />
                            </div>
                        </div>

                        {/* Difference Display */}
                        {actualCash && (
                            <div className={cn(
                                "rounded-lg p-3 flex items-center justify-between",
                                cashDifference === 0 && "bg-green-50",
                                cashDifference > 0 && "bg-blue-50",
                                cashDifference < 0 && "bg-red-50"
                            )}>
                                <div className="flex items-center gap-2">
                                    {cashDifference === 0 ? (
                                        <span className="text-green-700 font-medium">✓ Cash matches</span>
                                    ) : cashDifference > 0 ? (
                                        <>
                                            <TrendingUp className="h-4 w-4 text-blue-600" />
                                            <span className="text-blue-700 font-medium">Excess cash</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="text-red-700 font-medium">Cash shortage</span>
                                        </>
                                    )}
                                </div>
                                <span className={cn(
                                    "font-bold",
                                    cashDifference === 0 && "text-green-700",
                                    cashDifference > 0 && "text-blue-700",
                                    cashDifference < 0 && "text-red-700"
                                )}>
                                    {cashDifference >= 0 ? '+' : ''}₹{cashDifference.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this shift..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                        />
                    </div>

                    {/* Warning for large discrepancy */}
                    {Math.abs(cashDifference) > 100 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">Large discrepancy detected</p>
                                <p>Please recount the cash before closing the shift.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCloseShift}
                        disabled={loading}
                        className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? 'Closing...' : 'Close Shift'}
                    </button>
                </div>
            </div>
        </div>
    )
}
