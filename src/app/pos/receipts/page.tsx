'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Receipt, Search, Calendar, Printer, Mail, Eye,
  ChevronLeft, ChevronRight, X
} from 'lucide-react'
import ReceiptPreview from '@/components/pos/ReceiptPreview'

interface ReceiptItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  total: number
}

interface ReceiptData {
  id: string
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
  cashier?: { profile?: { fullName: string } }
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(page))
      if (searchQuery) params.append('search', searchQuery)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const res = await fetch(`/api/pos/receipts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReceipts(data.receipts || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, dateFrom, dateTo])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const handleView = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt)
    setShowPreview(true)
  }

  const handlePrint = () => {
    // Print the receipt content
    const content = document.getElementById('receipt-content')
    if (content) {
      const printWindow = window.open('', '', 'width=300,height=600')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; font-size: 12px; padding: 10px; }
              </style>
            </head>
            <body>${content.innerHTML}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleEmail = async (receipt: ReceiptData) => {
    const email = prompt('Enter email address:')
    if (!email) return

    try {
      const res = await fetch('/api/pos/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt.id, email })
      })

      if (res.ok) {
        toast.success(`Receipt sent to ${email}`)
      } else {
        toast.error('Failed to send email')
      }
    } catch (error) {
      toast.error('Failed to send email')
    }
  }

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      CASH: 'Cash',
      CARD: 'Card',
      UPI: 'UPI',
      WALLET: 'Wallet',
      SPLIT: 'Split'
    }
    return methods[method] || method
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Receipt History
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by receipt #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No receipts found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Receipt #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Payment</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-medium text-blue-600">
                      {receipt.receiptNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(receipt.transactionDate), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="py-3 px-4">
                      {receipt.customerName || 'Walk-in'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {receipt.items?.length || 0} items
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {formatPaymentMethod(receipt.paymentMethod)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ₹{receipt.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(receipt)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEmail(receipt)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Email"
                        >
                          <Mail className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Receipt Preview Modal */}
      {showPreview && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold">Receipt Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ReceiptPreview
              receipt={{
                ...selectedReceipt,
                customerName: selectedReceipt.customerName ?? undefined,
                customerPhone: selectedReceipt.customerPhone ?? undefined,
                cashierName: selectedReceipt.cashier?.profile?.fullName
              }}
              organization={{
                name: 'Your Business', // TODO: Fetch from org
                phone: '+91 9876543210'
              }}
              onPrint={handlePrint}
            />
          </div>
        </div>
      )}
    </div>
  )
}
