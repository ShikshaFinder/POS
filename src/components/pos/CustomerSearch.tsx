'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Phone, User, X, Star, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Customer {
    id: string
    name: string
    phone: string | null
    email: string | null
    loyaltyPoints: number
    totalPurchases: number
    totalVisits: number
    lastVisitDate: string | null
    transactions?: {
        id: string
        totalAmount: number
        transactionDate: string
    }[]
}

interface CustomerSearchProps {
    selectedCustomer: Customer | null
    onSelectCustomer: (customer: Customer | null) => void
    onAddNewCustomer: () => void
}

export default function CustomerSearch({
    selectedCustomer,
    onSelectCustomer,
    onAddNewCustomer
}: CustomerSearchProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const searchCustomers = useCallback(async (query: string) => {
        if (!query.trim()) {
            setCustomers([])
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/pos/customers?search=${encodeURIComponent(query)}`)
            if (res.ok) {
                const data = await res.json()
                setCustomers(data.customers || [])
            }
        } catch (error) {
            console.error('Failed to search customers:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => {
            searchCustomers(searchQuery)
        }, 300)
        return () => clearTimeout(timeout)
    }, [searchQuery, searchCustomers])

    const handleSelect = (customer: Customer) => {
        onSelectCustomer(customer)
        setSearchQuery('')
        setCustomers([])
        setIsOpen(false)
    }

    const handleClear = () => {
        onSelectCustomer(null)
        setSearchQuery('')
    }

    if (selectedCustomer) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                            <p className="text-xs text-gray-500">{selectedCustomer.phone || 'No phone'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Loyalty Points</p>
                            <p className="font-semibold text-blue-600 flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {selectedCustomer.loyaltyPoints}
                            </p>
                        </div>
                        <button
                            onClick={handleClear}
                            className="p-1.5 hover:bg-blue-100 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search customer by name or phone..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setIsOpen(true)
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <button
                    onClick={onAddNewCustomer}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    New
                </button>
            </div>

            {/* Search Results Dropdown */}
            {isOpen && (searchQuery.trim() || loading) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Searching...
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-gray-500 text-sm">No customers found</p>
                            <button
                                onClick={onAddNewCustomer}
                                className="mt-2 text-blue-600 text-sm font-medium hover:underline"
                            >
                                + Add new customer
                            </button>
                        </div>
                    ) : (
                        customers.map((customer) => (
                            <button
                                key={customer.id}
                                onClick={() => handleSelect(customer)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold">
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-medium text-gray-900">{customer.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {customer.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {customer.phone}
                                            </span>
                                        )}
                                        {customer.lastVisitDate && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(customer.lastVisitDate), { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Points</p>
                                    <p className="font-semibold text-blue-600">{customer.loyaltyPoints}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Close dropdown when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    )
}
