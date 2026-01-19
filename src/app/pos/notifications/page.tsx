'use client'

import { Bell, Package, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function NotificationsPage() {
    // Mock notifications data
    const notifications = [
        {
            id: 1,
            title: 'Low Stock Alert',
            message: 'Fresh Milk 1L is below 10 units. Please restock soon.',
            type: 'warning',
            timestamp: 'Just now',
            read: false
        },
        {
            id: 2,
            title: 'Shift Report Ready',
            message: 'The shift report for Morning Shift (Jan 19) has been generated successfully.',
            type: 'success',
            timestamp: '2 hours ago',
            read: false
        },
        {
            id: 3,
            title: 'System Update',
            message: 'Flavi POS has been updated to version 2.1.0 with new features.',
            type: 'info',
            timestamp: 'Yesterday',
            read: true
        },
        {
            id: 4,
            title: 'New Order Received',
            message: 'Order #ORD-2024-001 has been placed securely.',
            type: 'success',
            timestamp: 'Yesterday',
            read: true
        },
        {
            id: 5,
            title: 'Stock Adjustment',
            message: 'Inventory check completed. 5 items were adjusted.',
            type: 'info',
            timestamp: '2 days ago',
            read: true
        }
    ]

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />
            case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'info': return <Bell className="h-5 w-5 text-blue-500" />
            default: return <Bell className="h-5 w-5 text-gray-500" />
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Stay updated with alerts, reports, and system messages
                    </p>
                </div>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                    Mark all as read
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition-colors flex gap-4 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                            >
                                <div className={`p-2 rounded-lg flex-shrink-0 self-start ${notification.type === 'warning' ? 'bg-amber-50' :
                                        notification.type === 'success' ? 'bg-green-50' :
                                            'bg-blue-50'
                                    }`}>
                                    {getIcon(notification.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {notification.timestamp}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                                        {notification.message}
                                    </p>
                                </div>

                                {!notification.read && (
                                    <div className="self-center">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-100"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Bell className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
                        <p className="text-sm text-gray-500 mt-1">You're all caught up! Check back later.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
