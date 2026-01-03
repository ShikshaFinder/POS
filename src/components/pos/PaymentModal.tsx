'use client'

import { useState, useEffect } from 'react'
import { X, Banknote, CreditCard, Smartphone, Wallet, ArrowLeftRight, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'SPLIT'

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    totalAmount: number
    onConfirmPayment: (payment: PaymentDetails) => void
    loading: boolean
}

export interface PaymentDetails {
    method: PaymentMethod
    amountPaid: number
    changeGiven: number
    cashAmount: number
    cardAmount: number
    upiAmount: number
    walletAmount: number
    roundOff: number
    notes: string
}

export default function PaymentModal({
    isOpen,
    onClose,
    totalAmount,
    onConfirmPayment,
    loading
}: PaymentModalProps) {
    const [method, setMethod] = useState<PaymentMethod>('CASH')
    const [cashReceived, setCashReceived] = useState('')
    const [splitAmounts, setSplitAmounts] = useState({
        cash: 0,
        card: 0,
        upi: 0,
        wallet: 0
    })
    const [roundOff, setRoundOff] = useState(true)
    const [notes, setNotes] = useState('')

    // Round off calculation
    const roundedTotal = roundOff ? Math.round(totalAmount) : totalAmount
    const roundOffAmount = roundedTotal - totalAmount

    // Change calculation for cash
    const cashReceivedNum = parseFloat(cashReceived) || 0
    const changeToGive = method === 'CASH' ? Math.max(0, cashReceivedNum - roundedTotal) : 0

    // Split payment remaining
    const splitTotal = splitAmounts.cash + splitAmounts.card + splitAmounts.upi + splitAmounts.wallet
    const splitRemaining = roundedTotal - splitTotal

    // Quick cash denominations
    const quickDenominations = [50, 100, 200, 500, 1000, 2000]

    const handleQuickCash = (amount: number) => {
        const current = parseFloat(cashReceived) || 0
        setCashReceived(String(current + amount))
    }

    const handleConfirm = () => {
        const payment: PaymentDetails = {
            method,
            amountPaid: method === 'SPLIT' ? splitTotal : (method === 'CASH' ? cashReceivedNum : roundedTotal),
            changeGiven: changeToGive,
            cashAmount: method === 'CASH' ? cashReceivedNum : (method === 'SPLIT' ? splitAmounts.cash : 0),
            cardAmount: method === 'CARD' ? roundedTotal : (method === 'SPLIT' ? splitAmounts.card : 0),
            upiAmount: method === 'UPI' ? roundedTotal : (method === 'SPLIT' ? splitAmounts.upi : 0),
            walletAmount: method === 'WALLET' ? roundedTotal : (method === 'SPLIT' ? splitAmounts.wallet : 0),
            roundOff: roundOffAmount,
            notes
        }
        onConfirmPayment(payment)
    }

    const canConfirm = () => {
        if (method === 'CASH') {
            return cashReceivedNum >= roundedTotal
        }
        if (method === 'SPLIT') {
            return splitRemaining <= 0.01 // Allow small rounding errors
        }
        return true
    }

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setMethod('CASH')
            setCashReceived('')
            setSplitAmounts({ cash: 0, card: 0, upi: 0, wallet: 0 })
            setNotes('')
        }
    }, [isOpen])

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter' && canConfirm() && !loading) {
                handleConfirm()
            } else if (e.key === 'F1') {
                e.preventDefault()
                setMethod('CASH')
            } else if (e.key === 'F2') {
                e.preventDefault()
                setMethod('CARD')
            } else if (e.key === 'F3') {
                e.preventDefault()
                setMethod('UPI')
            } else if (e.key === 'F4') {
                e.preventDefault()
                setMethod('WALLET')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, method, cashReceived, loading])

    if (!isOpen) return null

    const paymentMethods = [
        { id: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote, shortcut: 'F1', color: 'green' },
        { id: 'CARD' as PaymentMethod, label: 'Card', icon: CreditCard, shortcut: 'F2', color: 'blue' },
        { id: 'UPI' as PaymentMethod, label: 'UPI', icon: Smartphone, shortcut: 'F3', color: 'purple' },
        { id: 'WALLET' as PaymentMethod, label: 'Wallet', icon: Wallet, shortcut: 'F4', color: 'orange' },
        { id: 'SPLIT' as PaymentMethod, label: 'Split', icon: ArrowLeftRight, shortcut: '', color: 'gray' }
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Total Display */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-4xl font-bold text-gray-900 mt-1">
                            ₹{roundedTotal.toFixed(2)}
                        </p>
                        {roundOffAmount !== 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                (Round off: {roundOffAmount > 0 ? '+' : ''}₹{roundOffAmount.toFixed(2)})
                            </p>
                        )}
                    </div>
                </div>

                {/* Payment Method Selection */}
                <div className="p-4">
                    <div className="grid grid-cols-5 gap-2 mb-4">
                        {paymentMethods.map((pm) => (
                            <button
                                key={pm.id}
                                onClick={() => setMethod(pm.id)}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                                    method === pm.id
                                        ? `border-${pm.color}-500 bg-${pm.color}-50`
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                <pm.icon className={cn(
                                    "h-5 w-5",
                                    method === pm.id ? `text-${pm.color}-600` : "text-gray-500"
                                )} />
                                <span className={cn(
                                    "text-xs font-medium",
                                    method === pm.id ? `text-${pm.color}-700` : "text-gray-600"
                                )}>
                                    {pm.label}
                                </span>
                                {pm.shortcut && (
                                    <span className="text-[10px] text-gray-400">{pm.shortcut}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Cash Payment UI */}
                    {method === 'CASH' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Cash Received</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                    <input
                                        type="number"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Quick Denominations */}
                            <div className="flex flex-wrap gap-2">
                                {quickDenominations.map((denom) => (
                                    <button
                                        key={denom}
                                        onClick={() => handleQuickCash(denom)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        +₹{denom}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCashReceived(String(roundedTotal))}
                                    className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Exact
                                </button>
                            </div>

                            {/* Change Display */}
                            {cashReceivedNum > 0 && (
                                <div className={cn(
                                    "p-4 rounded-lg flex items-center justify-between",
                                    changeToGive > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <Calculator className={cn(
                                            "h-5 w-5",
                                            changeToGive > 0 ? "text-green-600" : "text-red-600"
                                        )} />
                                        <span className={cn(
                                            "font-medium",
                                            changeToGive > 0 ? "text-green-700" : "text-red-700"
                                        )}>
                                            {changeToGive > 0 ? 'Change to Return' : 'Amount Short'}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-2xl font-bold",
                                        changeToGive > 0 ? "text-green-700" : "text-red-700"
                                    )}>
                                        ₹{changeToGive > 0 ? changeToGive.toFixed(2) : Math.abs(cashReceivedNum - roundedTotal).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Split Payment UI */}
                    {method === 'SPLIT' && (
                        <div className="space-y-3">
                            {[
                                { key: 'cash', label: 'Cash', icon: Banknote },
                                { key: 'card', label: 'Card', icon: CreditCard },
                                { key: 'upi', label: 'UPI', icon: Smartphone },
                                { key: 'wallet', label: 'Wallet', icon: Wallet }
                            ].map((item) => (
                                <div key={item.key} className="flex items-center gap-3">
                                    <item.icon className="h-5 w-5 text-gray-500" />
                                    <span className="w-16 text-sm font-medium text-gray-700">{item.label}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={splitAmounts[item.key as keyof typeof splitAmounts] || ''}
                                            onChange={(e) => setSplitAmounts({
                                                ...splitAmounts,
                                                [item.key]: parseFloat(e.target.value) || 0
                                            })}
                                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className={cn(
                                "p-3 rounded-lg text-center",
                                splitRemaining <= 0.01 ? "bg-green-50" : "bg-amber-50"
                            )}>
                                <span className={cn(
                                    "font-medium",
                                    splitRemaining <= 0.01 ? "text-green-700" : "text-amber-700"
                                )}>
                                    {splitRemaining <= 0.01 ? '✓ Fully Allocated' : `Remaining: ₹${splitRemaining.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Card/UPI/Wallet - Just confirmation */}
                    {(method === 'CARD' || method === 'UPI' || method === 'WALLET') && (
                        <div className="text-center py-6 text-gray-500">
                            <p>Click confirm to complete {method.toLowerCase()} payment</p>
                        </div>
                    )}

                    {/* Round Off Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Round off amount</span>
                        <button
                            onClick={() => setRoundOff(!roundOff)}
                            className={cn(
                                "relative w-11 h-6 rounded-full transition-colors",
                                roundOff ? "bg-blue-600" : "bg-gray-300"
                            )}
                        >
                            <span className={cn(
                                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                roundOff ? "left-5" : "left-0.5"
                            )} />
                        </button>
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes (optional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
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
                        onClick={handleConfirm}
                        disabled={!canConfirm() || loading}
                        className="flex-[2] py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processing...' : 'Confirm Payment (Enter)'}
                    </button>
                </div>
            </div>
        </div>
    )
}
