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
            } else if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault()
                setMethod('CASH')
            } else if (e.altKey && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                setMethod('CARD')
            } else if (e.altKey && e.key.toLowerCase() === 'u') {
                e.preventDefault()
                setMethod('UPI')
            } else if (e.altKey && e.key.toLowerCase() === 'w') {
                e.preventDefault()
                setMethod('WALLET')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, method, cashReceived, loading])

    if (!isOpen) return null

    const paymentMethods = [
        { id: 'CASH' as PaymentMethod, label: 'Cash', icon: Banknote, shortcut: 'Alt+C', color: 'green' },
        { id: 'CARD' as PaymentMethod, label: 'Card', icon: CreditCard, shortcut: 'Alt+D', color: 'blue' },
        { id: 'UPI' as PaymentMethod, label: 'UPI', icon: Smartphone, shortcut: 'Alt+U', color: 'purple' },
        { id: 'WALLET' as PaymentMethod, label: 'Wallet', icon: Wallet, shortcut: 'Alt+W', color: 'orange' },
        { id: 'SPLIT' as PaymentMethod, label: 'Split', icon: ArrowLeftRight, shortcut: '', color: 'gray' }
    ]

    return (
        <div className="fixed inset-0 bg-white sm:bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 active:p-0 safe-bottom fade-in h-[100dvh] w-full">
            <div className="bg-white sm:rounded-xl shadow-none sm:shadow-2xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Payment</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors tap-target"
                        aria-label="Close payment modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Total Display */}
                <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-b border-gray-200">
                    <div className="text-center">
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Amount</p>
                        <p className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1">
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
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4 sm:mb-5">
                        {paymentMethods.map((pm) => (
                            <button
                                key={pm.id}
                                onClick={() => setMethod(pm.id)}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-all touch-feedback",
                                    method === pm.id
                                        ? `border-${pm.color}-500 bg-${pm.color}-50`
                                        : "border-gray-200 hover:border-gray-300 active:border-gray-400"
                                )}
                                aria-pressed={method === pm.id}
                                aria-label={`Pay with ${pm.label}${pm.shortcut ? `, ${pm.shortcut}` : ''}`}
                            >
                                <pm.icon className={cn(
                                    "h-5 w-5 sm:h-6 sm:w-6",
                                    method === pm.id ? `text-${pm.color}-600` : "text-gray-500"
                                )} />
                                <span className={cn(
                                    "text-[10px] sm:text-xs font-medium",
                                    method === pm.id ? `text-${pm.color}-700` : "text-gray-600"
                                )}>
                                    {pm.label}
                                </span>
                                {pm.shortcut && (
                                    <span className="text-[9px] text-gray-400 hidden sm:inline">{pm.shortcut}</span>
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
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-xl font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent no-zoom-on-focus tap-target"
                                        placeholder="0.00"
                                        autoFocus
                                        aria-label="Enter cash received amount"
                                    />
                                </div>
                            </div>

                            {/* Quick Denominations */}
                            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                                {quickDenominations.map((denom) => (
                                    <button
                                        key={denom}
                                        onClick={() => handleQuickCash(denom)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-feedback"
                                        aria-label={`Add ${denom} rupees`}
                                    >
                                        +₹{denom}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCashReceived(String(roundedTotal))}
                                    className="px-3 py-2 bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-700 rounded-lg text-xs sm:text-sm font-medium transition-colors touch-feedback"
                                    aria-label="Set exact amount"
                                >
                                    Exact
                                </button>
                            </div>

                            {/* Change Display */}
                            {cashReceivedNum > 0 && (
                                <div className={cn(
                                    "p-3 sm:p-4 rounded-lg flex items-center justify-between",
                                    changeToGive > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                                )}
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div className="flex items-center gap-2">
                                        <Calculator className={cn(
                                            "h-5 w-5 flex-shrink-0",
                                            changeToGive > 0 ? "text-green-600" : "text-red-600"
                                        )} />
                                        <span className={cn(
                                            "text-sm sm:text-base font-medium",
                                            changeToGive > 0 ? "text-green-700" : "text-red-700"
                                        )}>
                                            {changeToGive > 0 ? 'Change' : 'Short'}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-xl sm:text-2xl font-bold",
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
                                <div key={item.key} className="flex items-center gap-2 sm:gap-3">
                                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                                    <span className="w-12 sm:w-16 text-xs sm:text-sm font-medium text-gray-700">{item.label}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">₹</span>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={splitAmounts[item.key as keyof typeof splitAmounts] || ''}
                                            onChange={(e) => setSplitAmounts({
                                                ...splitAmounts,
                                                [item.key]: parseFloat(e.target.value) || 0
                                            })}
                                            className="w-full pl-6 sm:pl-8 pr-2 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm no-zoom-on-focus tap-target"
                                            placeholder="0.00"
                                            aria-label={`${item.label} amount`}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className={cn(
                                "p-3 rounded-lg text-center text-sm sm:text-base",
                                splitRemaining <= 0.01 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
                            )}
                                role="status"
                                aria-live="polite"
                            >
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
                        <div className="text-center py-8 text-gray-500">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                                {method === 'CARD' && <CreditCard className="h-8 w-8" />}
                                {method === 'UPI' && <Smartphone className="h-8 w-8" />}
                                {method === 'WALLET' && <Wallet className="h-8 w-8" />}
                            </div>
                            <p className="text-sm sm:text-base">Click confirm to complete {method.toLowerCase()} payment</p>
                        </div>
                    )}

                    {/* Round Off Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Round off amount</span>
                        <button
                            onClick={() => setRoundOff(!roundOff)}
                            className={cn(
                                "relative w-11 h-6 rounded-full transition-colors tap-target",
                                roundOff ? "bg-blue-600" : "bg-gray-300"
                            )}
                            role="switch"
                            aria-checked={roundOff}
                            aria-label="Toggle round off"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent no-zoom-on-focus tap-target"
                            aria-label="Payment notes"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors tap-target-lg touch-feedback"
                        aria-label="Cancel payment"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm() || loading}
                        className="flex-1 sm:flex-[2] py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors tap-target-lg touch-feedback"
                        aria-label="Confirm payment"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <span className="hidden sm:inline">Confirm Payment (Enter)</span>
                                <span className="sm:hidden">Confirm Payment</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
