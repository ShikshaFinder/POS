'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  balanceAmount: number;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  order: {
    id: string;
    orderNumber: string;
  };
  payments: Payment[];
  isOverdue: boolean;
  daysOverdue: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-700',
};

export default function POSInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    overdueAmount: 0,
    overdueCount: 0,
  });

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setSummary(data.summary || { totalOutstanding: 0, overdueAmount: 0, overdueCount: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/pos/owner-dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            My Invoices
          </h1>
          <p className="text-gray-500 text-sm">Track your invoices and payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Outstanding</p>
              <p className="text-xl font-bold text-orange-600">
                KES {summary.totalOutstanding.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Overdue Amount</p>
              <p className="text-xl font-bold text-red-600">
                KES {summary.overdueAmount.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Overdue Invoices</p>
              <p className="text-xl font-bold text-red-600">{summary.overdueCount}</p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Invoices Yet</h3>
          <p className="text-gray-500 mt-1">Invoices will appear here when orders are confirmed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                invoice.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              {/* Invoice Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      Order: {invoice.order.orderNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      KES {invoice.totalAmount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                      {invoice.isOverdue && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          {invoice.daysOverdue}d OVERDUE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-gray-500">
                    Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </span>
                  {invoice.balanceAmount > 0 && (
                    <span className="text-orange-600 font-medium">
                      Balance: KES {invoice.balanceAmount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Invoice Details */}
              {selectedInvoice?.id === invoice.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {/* Amount Breakdown */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">KES {invoice.subtotal.toLocaleString()}</span>
                      </div>
                      {invoice.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-green-600">-KES {invoice.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {invoice.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax</span>
                          <span className="text-gray-900">KES {invoice.taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">KES {invoice.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid</span>
                        <span className="text-green-600">
                          KES {(invoice.totalAmount - invoice.balanceAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-900">Balance Due</span>
                        <span className={invoice.balanceAmount > 0 ? 'text-orange-600' : 'text-green-600'}>
                          KES {invoice.balanceAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  {invoice.payments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Payment History</h4>
                      <div className="space-y-2">
                        {invoice.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                KES {payment.amount.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.paymentMethod} {payment.reference && `• ${payment.reference}`}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {invoice.paidAt && (
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <span className="ml-2 text-green-600">
                          {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  {invoice.notes && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
