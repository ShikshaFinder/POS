'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Save, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Product {
    id: string
    name: string
    sku: string
    unit: string
    category: string
}

interface POSStock {
    id: string
    productId: string
    currentStock: number
    minimumStock: number
    product: Product
}

interface SnapshotEntry {
    productId: string
    systemStock: number
    physicalStock: number | null
    variance: number | null
    varianceReason: string
}

export default function StockCountPage() {
    const [stocks, setStocks] = useState<POSStock[]>([])
    const [entries, setEntries] = useState<{ [key: string]: SnapshotEntry }>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        fetchStocks()
    }, [])

    const fetchStocks = async () => {
        try {
            const res = await fetch('/api/pos/stock')
            if (res.ok) {
                const data = await res.json()
                const posStocks = data.stocks || []
                setStocks(posStocks)

                // Initialize entries
                const initial: { [key: string]: SnapshotEntry } = {}
                posStocks.forEach((stock: POSStock) => {
                    initial[stock.productId] = {
                        productId: stock.productId,
                        systemStock: stock.currentStock,
                        physicalStock: null,
                        variance: null,
                        varianceReason: ''
                    }
                })
                setEntries(initial)
            }
        } catch (error) {
            console.error('Failed to fetch stocks:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateEntry = (productId: string, physicalStock: number) => {
        const current = entries[productId]
        const variance = physicalStock - current.systemStock
        setEntries({
            ...entries,
            [productId]: {
                ...current,
                physicalStock,
                variance
            }
        })
    }

    const updateReason = (productId: string, reason: string) => {
        setEntries({
            ...entries,
            [productId]: {
                ...entries[productId],
                varianceReason: reason
            }
        })
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setMessage(null)

        const products = Object.values(entries)
            .filter(e => e.physicalStock !== null)
            .map(e => ({
                productId: e.productId,
                physicalStock: e.physicalStock,
                varianceReason: e.varianceReason || undefined
            }))

        if (products.length === 0) {
            setMessage({ type: 'error', text: 'Please enter at least one physical count' })
            setSubmitting(false)
            return
        }

        try {
            const res = await fetch('/api/pos/stock/snapshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products, snapshotSession: 'EOD' })
            })

            if (res.ok) {
                const data = await res.json()
                setMessage({ type: 'success', text: `Saved ${data.snapshots.length} stock counts!` })
            } else {
                const data = await res.json()
                setMessage({ type: 'error', text: data.error || 'Failed to save' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save stock counts' })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/pos/stock" className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Daily Stock Count</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Record physical stock counts for end-of-day reconciliation
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {submitting ? 'Saving...' : 'Save Counts'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            {/* Stock Count Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Physical Count</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {stocks.map(stock => {
                            const entry = entries[stock.productId]
                            const hasVariance = entry?.variance !== null && entry.variance !== 0

                            return (
                                <tr key={stock.id} className={hasVariance ? 'bg-yellow-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{stock.product.name}</div>
                                        <div className="text-sm text-gray-500">{stock.product.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900">
                                        {stock.currentStock} {stock.product.unit}
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Enter count"
                                            value={entry?.physicalStock ?? ''}
                                            onChange={(e) => updateEntry(stock.productId, parseFloat(e.target.value) || 0)}
                                            className="w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        {entry?.variance !== null && (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.variance === 0
                                                    ? 'bg-green-100 text-green-800'
                                                    : entry.variance > 0
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                {entry.variance > 0 ? '+' : ''}{entry.variance}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasVariance && (
                                            <input
                                                type="text"
                                                placeholder="Reason for variance"
                                                value={entry?.varianceReason || ''}
                                                onChange={(e) => updateReason(stock.productId, e.target.value)}
                                                className="w-48 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
