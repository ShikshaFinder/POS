'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Package, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchNotifications = async () => {
        try {
            const response = await fetch('/api/pos/notifications')
            if (response.ok) {
                const data = await response.json()
                setNotifications(data.notifications || [])
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkAsRead = async (id: string) => {
        try {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
            await fetch('/api/pos/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            fetchNotifications()
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            await fetch('/api/pos/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allRead: true })
            })
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error)
            fetchNotifications()
        }
    }

    const getIcon = (notification: any) => {
        if (notification.posAlertId) return <AlertTriangle className="h-5 w-5 text-amber-500" />
        if (notification.posOrderId) return <Package className="h-5 w-5 text-blue-500" />
        if (notification.posInvoiceId) return <FileText className="h-5 w-5 text-green-500" />
        return <Bell className="h-5 w-5 text-gray-500" />
    }

    const getIconContainerClass = (notification: any) => {
        if (notification.posAlertId) return 'bg-amber-50'
        if (notification.posOrderId) return 'bg-blue-50'
        if (notification.posInvoiceId) return 'bg-green-50'
        return 'bg-gray-50'
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Stay updated with alerts, reports, and system messages
                    </p>
                </div>
                <button
                    onClick={handleMarkAllAsRead}
                    disabled={!notifications.some(n => !n.isRead)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100 sm:border-transparent"
                >
                    Mark all as read
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
                        <p className="text-gray-500">Loading notifications...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleMarkAsRead(notification.id)}
                                className={`p-5 hover:bg-gray-50 transition-colors flex gap-4 cursor-pointer group ${!notification.isRead ? 'bg-blue-50/20' : ''}`}
                            >
                                <div className={`p-2.5 rounded-xl flex-shrink-0 self-start transition-transform group-hover:scale-110 ${getIconContainerClass(notification)}`}>
                                    {getIcon(notification)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className={`text-sm ${!notification.isRead ? 'text-gray-900 font-bold' : 'text-gray-700 font-medium'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                                        {notification.body}
                                    </p>
                                </div>

                                {!notification.isRead && (
                                    <div className="self-center pl-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-5 border border-gray-100">
                            <Bell className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No notifications</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                            You're all caught up! When you receive alerts or messages, they'll appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
