'use client'

import { useEffect, useState } from 'react'
import { Truck, Package, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TransferItem {
    id: string
    product: { id: string; name: string; sku: string; unit: string }
    requestedQty: number
    approvedQty: number | null
    dispatchedQty: number | null
    receivedQty: number | null
}

interface Transfer {
    id: string
    transferNumber: string
    status: string
    fromPos?: { name: string; code: string } | null
    fromStorage?: { name: string } | null
    dispatchedAt: string | null
    items: TransferItem[]
}

export default function ReceiveStockPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
    const [receivedItems, setReceivedItems] = useState<{ [key: string]: number }>({})
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        fetchTransfers()
    }, [])

    const fetchTransfers = async () => {
        try {
            const res = await fetch('/api/pos/stock/receive')
            if (res.ok) {
                const data = await res.json()
                setTransfers(data.transfers || [])
            }
        } catch (error) {
            console.error('Failed to fetch transfers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReceive = async () => {
        if (!selectedTransfer) return

        setSubmitting(true)
        setMessage(null)

        try {
            const items = selectedTransfer.items.map(item => ({
                id: item.id,
                receivedQty: receivedItems[item.id] ?? (item.dispatchedQty || item.approvedQty || item.requestedQty)
            }))

            const res = await fetch('/api/pos/stock/receive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transferId: selectedTransfer.id,
                    receivedItems: items
                })
            })

            if (res.ok) {
                setMessage({ type: 'success', text: 'Stock received successfully!' })
                setSelectedTransfer(null)
                setReceivedItems({})
                fetchTransfers()
            } else {
                const data = await res.json()
                setMessage({ type: 'error', text: data.error || 'Failed to receive stock' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to receive stock' })
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
            <div className="flex items-center gap-4">
                <Link href="/pos/stock" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Receive Stock</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Receive incoming stock transfers from warehouse
                    </p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {selectedTransfer ? (
                /* Receive Form */
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold">{selectedTransfer.transferNumber}</h2>
                            <p className="text-sm text-gray-500">
                                From: {selectedTransfer.fromPos?.name || selectedTransfer.fromStorage?.name || 'Warehouse'}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedTransfer(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 mb-6">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatched</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {selectedTransfer.items.map(item => {
                                const dispatched = item.dispatchedQty || item.approvedQty || item.requestedQty
                                return (
                                    <tr key={item.id}>
                                        <td className="px-4 py-4">
                                            <div className="font-medium">{item.product.name}</div>
                                            <div className="text-sm text-gray-500">{item.product.sku}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {dispatched} {item.product.unit}
                                        </td>
                                        <td className="px-4 py-4">
                                            <input
                                                type="number"
                                                min="0"
                                                value={receivedItems[item.id] ?? dispatched}
                                                onChange={(e) => setReceivedItems({
                                                    ...receivedItems,
                                                    [item.id]: parseFloat(e.target.value) || 0
                                                })}
                                                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setSelectedTransfer(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReceive}
                            disabled={submitting}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <CheckCircle className="h-4 w-4" />
                            {submitting ? 'Receiving...' : 'Confirm Receipt'}
                        </button>
                    </div>
                </div>
            ) : (
                /* Transfers List */
                <div className="bg-white rounded-lg border border-gray-200">
                    {transfers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No pending transfers to receive</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {transfers.map(transfer => (
                                <div
                                    key={transfer.id}
                                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                    onClick={() => setSelectedTransfer(transfer)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Package className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{transfer.transferNumber}</p>
                                            <p className="text-sm text-gray-500">
                                                From: {transfer.fromPos?.name || transfer.fromStorage?.name || 'Warehouse'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {transfer.items.length} items
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transfer.status === 'IN_TRANSIT'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {transfer.status}
                                        </span>
                                        {transfer.dispatchedAt && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Dispatched: {new Date(transfer.dispatchedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
