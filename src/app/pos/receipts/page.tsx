'use client'

import { useEffect, useState } from 'react'
import { Receipt, Download, Eye } from 'lucide-react'

interface ReceiptData {
  id: string
  invoiceNumber: string
  customerName: string | null
  totalAmount: number
  createdAt: string
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/pos/receipts')
      if (res.ok) {
        const data = await res.json()
        setReceipts(data.receipts || [])
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and print customer receipts
        </p>
      </div>

      {/* Receipts List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Receipts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {receipts.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No receipts available</p>
            </div>
          ) : (
            receipts.map((receipt) => (
              <div key={receipt.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {receipt.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {receipt.customerName || 'Walk-in Customer'} • {' '}
                      {new Date(receipt.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{receipt.totalAmount.toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
