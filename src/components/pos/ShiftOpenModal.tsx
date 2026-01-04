'use client'

import { useState } from 'react'
import { X, DollarSign, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShiftOpenModalProps {
    isOpen: boolean
    onClose: () => void
    onShiftOpened: (session: any) => void
}

export default function ShiftOpenModal({
    isOpen,
    onClose,
    onShiftOpened
}: ShiftOpenModalProps) {
    const [loading, setLoading] = useState(false)
    const [openingBalance, setOpeningBalance] = useState('')

    const quickAmounts = [500, 1000, 2000, 5000]

    const handleOpenShift = async () => {
        const balance = parseFloat(openingBalance) || 0

        if (balance < 0) {
            toast.error('Opening balance cannot be negative')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/pos/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openingBalance: balance })
            })

            if (res.ok) {
                const data = await res.json()
                toast.success('Shift opened successfully')
                onShiftOpened(data.session)
                onClose()
                setOpeningBalance('')
            } else {
                const error = await res.json()
                toast.error(error.error || 'Failed to open shift')
            }
        } catch (error) {
            console.error('Open shift error:', error)
            toast.error('Failed to open shift')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Open New Shift</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Enter the opening cash balance in your drawer
                        </p>
                    </div>

                    {/* Opening Balance Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opening Cash Balance
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">₹</span>
                            <input
                                type="number"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-4 text-2xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {quickAmounts.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => setOpeningBalance(String(amount))}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                ₹{amount.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                        <p>💡 Count the cash in your drawer before starting your shift.</p>
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
                        onClick={handleOpenShift}
                        disabled={loading}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? 'Opening...' : 'Start Shift'}
                    </button>
                </div>
            </div>
        </div>
    )
}
