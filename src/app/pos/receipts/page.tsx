'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Receipt, Search, Calendar, Printer, Mail, Eye,
  ChevronLeft, ChevronRight, X, Download, Share2,
  MessageCircle, Phone, Copy, Check, Filter,
  CreditCard, Banknote, Smartphone, Wallet
} from 'lucide-react'
import ReceiptPreview from '@/components/pos/ReceiptPreview'
import { cn } from '@/lib/utils'

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
  const [showFilters, setShowFilters] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null)

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
    const content = document.getElementById('receipt-content')
    if (content) {
      const printWindow = window.open('', '_blank', 'width=400,height=700')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${selectedReceipt?.receiptNumber || 'POS'}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'Courier New', Courier, monospace; 
                  font-size: 12px; 
                  padding: 15px;
                  max-width: 300px;
                  margin: 0 auto;
                  background: white;
                  color: #000;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .text-xs { font-size: 10px; }
                .text-sm { font-size: 12px; }
                .border-t { border-top: 1px dashed #9CA3AF; margin: 12px 0; }
                .flex { display: flex; justify-content: space-between; }
                .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                svg { display: none; }
                @media print {
                  body { width: 80mm; margin: 0; padding: 5mm; }
                  @page { size: 80mm auto; margin: 0; }
                }
              </style>
            </head>
            <body>${content.innerHTML}</body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 250)
      }
    }
  }

  const handleDownload = (receipt: ReceiptData) => {
    // Generate text receipt for download
    const lines = [
      '================================',
      '         RECEIPT',
      '================================',
      '',
      `Receipt #: ${receipt.receiptNumber}`,
      `Date: ${format(new Date(receipt.transactionDate), 'dd/MM/yyyy HH:mm')}`,
      receipt.customerName ? `Customer: ${receipt.customerName}` : '',
      '',
      '--------------------------------',
      'ITEMS:',
      '--------------------------------',
      ...receipt.items.map(item => 
        `${item.productName}\n  ${item.quantity} x ₹${item.unitPrice.toFixed(2)} = ₹${item.total.toFixed(2)}`
      ),
      '',
      '--------------------------------',
      `Subtotal:  ₹${receipt.subtotal.toFixed(2)}`,
      receipt.discountAmount > 0 ? `Discount:  -₹${receipt.discountAmount.toFixed(2)}` : '',
      receipt.taxAmount > 0 ? `Tax:       ₹${receipt.taxAmount.toFixed(2)}` : '',
      '--------------------------------',
      `TOTAL:     ₹${receipt.totalAmount.toFixed(2)}`,
      '',
      `Payment:   ${formatPaymentMethod(receipt.paymentMethod)}`,
      `Paid:      ₹${receipt.amountPaid.toFixed(2)}`,
      receipt.changeGiven > 0 ? `Change:    ₹${receipt.changeGiven.toFixed(2)}` : '',
      '',
      '================================',
      '     Thank you for your purchase!',
      '================================',
    ].filter(Boolean).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receipt.receiptNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Receipt downloaded')
  }

  const handleShare = async (receipt: ReceiptData) => {
    const text = `Receipt #${receipt.receiptNumber}\nTotal: ₹${receipt.totalAmount.toFixed(2)}\nDate: ${format(new Date(receipt.transactionDate), 'dd MMM yyyy, HH:mm')}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receipt.receiptNumber}`,
          text: text,
        })
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text)
      toast.success('Receipt details copied to clipboard')
    }
  }

  const handleWhatsApp = async (receipt: ReceiptData) => {
    const phone = receipt.customerPhone || prompt('Enter phone number (with country code):')
    if (!phone) return

    setSendingWhatsApp(receipt.id)
    try {
      const res = await fetch('/api/pos/send-receipt-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receiptId: receipt.id, 
          phone: phone.replace(/\D/g, '')
        })
      })

      if (res.ok) {
        toast.success('Receipt sent via WhatsApp')
      } else {
        // Fallback: Open WhatsApp with message
        const message = encodeURIComponent(
          `*Receipt #${receipt.receiptNumber}*\n` +
          `Date: ${format(new Date(receipt.transactionDate), 'dd MMM yyyy, HH:mm')}\n\n` +
          `Items:\n${receipt.items.map(i => `• ${i.productName} x${i.quantity} - ₹${i.total.toFixed(2)}`).join('\n')}\n\n` +
          `*Total: ₹${receipt.totalAmount.toFixed(2)}*\n` +
          `Payment: ${formatPaymentMethod(receipt.paymentMethod)}\n\n` +
          `Thank you for your purchase!`
        )
        const cleanPhone = phone.replace(/\D/g, '')
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
      }
    } catch (error) {
      toast.error('Failed to send WhatsApp')
    } finally {
      setSendingWhatsApp(null)
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

  const handleCopyReceiptNumber = async (receiptNumber: string, id: string) => {
    await navigator.clipboard.writeText(receiptNumber)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Receipt number copied')
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

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <Banknote className="h-4 w-4" />
      case 'CARD': return <CreditCard className="h-4 w-4" />
      case 'UPI': return <Smartphone className="h-4 w-4" />
      case 'WALLET': return <Wallet className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters = searchQuery || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">Receipt History</span>
          <span className="sm:hidden">Receipts</span>
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            showFilters || hasActiveFilters
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Filters - Collapsible on mobile */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by receipt #, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Receipts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="mt-2 text-gray-500">Loading receipts...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No receipts found</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Receipts will appear here after sales'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyReceiptNumber(receipt.receiptNumber, receipt.id)}
                            className="font-mono font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            #{receipt.receiptNumber}
                            {copiedId === receipt.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {format(new Date(receipt.transactionDate), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          ₹{receipt.totalAmount.toFixed(2)}
                        </p>
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                          receipt.paymentMethod === 'CASH' && "bg-green-100 text-green-700",
                          receipt.paymentMethod === 'CARD' && "bg-blue-100 text-blue-700",
                          receipt.paymentMethod === 'UPI' && "bg-purple-100 text-purple-700",
                          receipt.paymentMethod === 'WALLET' && "bg-amber-100 text-amber-700",
                        )}>
                          {getPaymentIcon(receipt.paymentMethod)}
                          {formatPaymentMethod(receipt.paymentMethod)}
                        </div>
                      </div>
                    </div>

                    {/* Customer & Items Info */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                          {receipt.customerName?.[0]?.toUpperCase() || 'W'}
                        </span>
                        <span className="truncate max-w-[120px]">
                          {receipt.customerName || 'Walk-in'}
                        </span>
                      </div>
                      <div className="text-gray-400">•</div>
                      <div className="text-gray-600">
                        {receipt.items?.length || 0} item{(receipt.items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="grid grid-cols-5 divide-x divide-gray-100">
                    <button
                      onClick={() => handleView(receipt)}
                      className="flex flex-col items-center justify-center py-3 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">View</span>
                    </button>
                    <button
                      onClick={() => handleDownload(receipt)}
                      className="flex flex-col items-center justify-center py-3 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">Save</span>
                    </button>
                    <button
                      onClick={() => handleWhatsApp(receipt)}
                      disabled={sendingWhatsApp === receipt.id}
                      className="flex flex-col items-center justify-center py-3 text-green-600 hover:bg-green-50 active:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleEmail(receipt)}
                      className="flex flex-col items-center justify-center py-3 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">Email</span>
                    </button>
                    <button
                      onClick={() => handleShare(receipt)}
                      className="flex flex-col items-center justify-center py-3 text-purple-600 hover:bg-purple-50 active:bg-purple-100 transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                      <span className="text-[10px] mt-1 font-medium">Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="text-sm text-gray-600">
                Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Receipt Preview Modal - Full screen on mobile */}
      {showPreview && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-auto sm:max-w-md sm:mx-4 sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0">
              <h3 className="font-semibold text-lg">Receipt #{selectedReceipt.receiptNumber}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <ReceiptPreview
                receipt={{
                  ...selectedReceipt,
                  customerName: selectedReceipt.customerName ?? undefined,
                  customerPhone: selectedReceipt.customerPhone ?? undefined,
                  cashierName: selectedReceipt.cashier?.profile?.fullName
                }}
                organization={{
                  name: 'Your Business',
                  phone: '+91 9876543210'
                }}
              />
            </div>

            {/* Modal Actions - Fixed at bottom */}
            <div className="border-t border-gray-200 p-4 bg-white grid grid-cols-4 gap-2">
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center py-3 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <Printer className="h-5 w-5 text-gray-700" />
                <span className="text-xs mt-1 font-medium text-gray-700">Print</span>
              </button>
              <button
                onClick={() => handleDownload(selectedReceipt)}
                className="flex flex-col items-center justify-center py-3 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <Download className="h-5 w-5 text-gray-700" />
                <span className="text-xs mt-1 font-medium text-gray-700">Save</span>
              </button>
              <button
                onClick={() => handleWhatsApp(selectedReceipt)}
                className="flex flex-col items-center justify-center py-3 bg-green-100 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-green-700" />
                <span className="text-xs mt-1 font-medium text-green-700">WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare(selectedReceipt)}
                className="flex flex-col items-center justify-center py-3 bg-blue-100 rounded-lg hover:bg-blue-200 active:bg-blue-300 transition-colors"
              >
                <Share2 className="h-5 w-5 text-blue-700" />
                <span className="text-xs mt-1 font-medium text-blue-700">Share</span>
              </button>
            </div>
          </div>

          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setShowPreview(false)} 
          />
        </div>
      )}
    </div>
  )
}
