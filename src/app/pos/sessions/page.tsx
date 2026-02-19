'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
    Clock, PlayCircle, StopCircle, History,
    Banknote, CreditCard, Smartphone,
    User
} from 'lucide-react'
import ShiftOpenModal from '@/components/pos/ShiftOpenModal'
import ShiftCloseModal from '@/components/pos/ShiftCloseModal'
import { cn } from '@/lib/utils'

interface Session {
    id: string
    sessionNumber: string
    openedAt: string
    closedAt: string | null
    openingBalance: number
    closingBalance: number | null
    actualCash: number | null
    cashDifference: number | null
    totalSales: number
    totalCash: number
    totalCard: number
    totalUpi: number
    transactionCount: number
    status: string
    notes: string | null
    cashier?: { name: string; email?: string; profile?: { fullName?: string } }
}

// Helper function to transform session data from API response
function transformSession(session: any): Session | null {
    if (!session) return null
    return {
        ...session,
        totalSales: session.totalSales ?? 0,
        totalCash: session.totalCash ?? 0,
        totalCard: session.totalCard ?? 0,
        // Handle Prisma field name (totalUpi) vs interface name (totalUPI)
        totalUPI: session.totalUPI ?? session.totalUpi ?? 0,
        // totalWallet may not exist in schema
        totalWallet: session.totalWallet ?? 0,
        transactionCount: session.transactionCount ?? 0,
        openingBalance: session.openingBalance ?? 0,
        cashier: session.cashier ? {
            name: session.cashier.profile?.fullName || session.cashier.email || 'Unknown',
            email: session.cashier.email,
            profile: session.cashier.profile
        } : undefined
    }
}

export default function SessionsPage() {
    const [currentSession, setCurrentSession] = useState<Session | null>(null)
    const [pastSessions, setPastSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [showOpenModal, setShowOpenModal] = useState(false)
    const [showCloseModal, setShowCloseModal] = useState(false)

    const fetchCurrentSession = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/sessions?current=true')
            if (res.ok) {
                const data = await res.json()
                setCurrentSession(transformSession(data.session))
            }
        } catch (error) {
            console.error('Failed to fetch current session:', error)
        }
    }, [])

    const fetchPastSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/sessions')
            if (res.ok) {
                const data = await res.json()
                const sessions = (data.sessions || []).map(transformSession).filter(Boolean) as Session[]
                setPastSessions(sessions)
            }
        } catch (error) {
            console.error('Failed to fetch past sessions:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCurrentSession()
        fetchPastSessions()
    }, [fetchCurrentSession, fetchPastSessions])

    const handleShiftOpened = (session: any) => {
        setCurrentSession(transformSession(session))
        fetchPastSessions()
    }

    const handleShiftClosed = () => {
        setCurrentSession(null)
        fetchPastSessions()
    }

    const formatDuration = (start: string, end: string | null) => {
        const startDate = new Date(start)
        const endDate = end ? new Date(end) : new Date()
        const hours = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
        const minutes = Math.floor(((endDate.getTime() - startDate.getTime()) % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>

            {/* Current Session Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Current Shift
                    </h2>
                    {currentSession ? (
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                            <StopCircle className="h-4 w-4" />
                            Close Shift
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowOpenModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            <PlayCircle className="h-4 w-4" />
                            Open Shift
                        </button>
                    )}
                </div>

                {currentSession ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Session Info */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs text-gray-500 mb-1">Shift #{currentSession.sessionNumber}</p>
                            <p className="text-sm text-gray-600">
                                Started: {format(new Date(currentSession.openedAt), 'HH:mm')}
                            </p>
                            <p className="text-sm text-gray-600">
                                Duration: {formatDuration(currentSession.openedAt, null)}
                            </p>
                            {currentSession.cashier && (
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                    <User className="h-3 w-3" />
                                    {currentSession.cashier.profile?.fullName || currentSession.cashier.name}
                                </p>
                            )}
                        </div>

                        {/* Total Sales */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-xs text-green-600 mb-1">Total Sales</p>
                            <p className="text-2xl font-bold text-green-700">
                                ₹{currentSession.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-green-600">{currentSession.transactionCount} transactions</p>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-blue-600 mb-2">Payment Breakdown</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <Banknote className="h-3 w-3 text-green-600" />
                                    <span>₹{currentSession.totalCash.toFixed(0)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3 text-blue-600" />
                                    <span>₹{currentSession.totalCard.toFixed(0)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Smartphone className="h-3 w-3 text-purple-600" />
                                    <span>₹{(currentSession.totalUpi || 0).toFixed(0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cash in Drawer */}
                        <div className="bg-amber-50 rounded-lg p-4">
                            <p className="text-xs text-amber-600 mb-1">Expected Cash</p>
                            <p className="text-2xl font-bold text-amber-700">
                                ₹{(currentSession.openingBalance + currentSession.totalCash).toFixed(2)}
                            </p>
                            <p className="text-xs text-amber-600">Opening: ₹{currentSession.openingBalance}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">No active shift</p>
                        <p className="text-sm">Open a shift to start processing sales</p>
                    </div>
                )}
            </div>

            {/* Past Sessions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-gray-600" />
                    Shift History
                </h2>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : pastSessions.filter(s => s.status === 'CLOSED').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No past sessions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-2 font-medium text-gray-600">Shift #</th>
                                    <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                                    <th className="text-left py-3 px-2 font-medium text-gray-600">Duration</th>
                                    <th className="text-left py-3 px-2 font-medium text-gray-600">Cashier</th>
                                    <th className="text-right py-3 px-2 font-medium text-gray-600">Sales</th>
                                    <th className="text-right py-3 px-2 font-medium text-gray-600">Transactions</th>
                                    <th className="text-right py-3 px-2 font-medium text-gray-600">Cash Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pastSessions.filter(s => s.status === 'CLOSED').map((session) => (
                                    <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-2 font-medium">{session.sessionNumber}</td>
                                        <td className="py-3 px-2">
                                            {format(new Date(session.openedAt), 'dd MMM yyyy')}
                                        </td>
                                        <td className="py-3 px-2">
                                            {formatDuration(session.openedAt, session.closedAt)}
                                        </td>
                                        <td className="py-3 px-2">{session.cashier?.profile?.fullName || session.cashier?.name || '-'}</td>
                                        <td className="py-3 px-2 text-right font-medium">
                                            ₹{session.totalSales.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-2 text-right">{session.transactionCount}</td>
                                        <td className={cn(
                                            "py-3 px-2 text-right font-medium",
                                            (session.cashDifference || 0) === 0 && "text-green-600",
                                            (session.cashDifference || 0) > 0 && "text-blue-600",
                                            (session.cashDifference || 0) < 0 && "text-red-600"
                                        )}>
                                            {(session.cashDifference || 0) === 0 ? (
                                                '✓ OK'
                                            ) : (
                                                <>
                                                    {(session.cashDifference || 0) > 0 ? '+' : ''}
                                                    ₹{(session.cashDifference || 0).toFixed(2)}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ShiftOpenModal
                isOpen={showOpenModal}
                onClose={() => setShowOpenModal(false)}
                onShiftOpened={handleShiftOpened}
            />
            <ShiftCloseModal
                isOpen={showCloseModal}
                onClose={() => setShowCloseModal(false)}
                session={currentSession}
                onShiftClosed={handleShiftClosed}
            />
        </div>
    )
}
