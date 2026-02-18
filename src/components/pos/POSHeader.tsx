'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Bell, User, LogOut, Settings, CreditCard, Shield, Clock } from 'lucide-react'
import SyncStatusIndicator from './SyncStatusIndicator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

export function POSHeader() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/pos/notifications?limit=5')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.notifications?.filter((n: any) => !n.isRead).length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchNotifications()
      // Poll every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (isRead) return; // Already read

    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))

      await fetch('/api/pos/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Rollback on error
      fetchNotifications()
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-3 sm:px-6 flex-shrink-0 safe-top transition-all">
      {/* Left Side: Brand (Mobile) or Time (Desktop) */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Desktop: Show Date & Time */}
        <div className="hidden md:block">
          <p className="text-sm font-medium text-gray-900">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-xs text-gray-500">
            {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>

        {/* Mobile: Show Brand Logo & Name */}
        <div className="md:hidden flex items-center gap-2">
          <img src="/flavi-logo.png" alt="Flavi POS" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Flavi POS</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Store Manager</p>
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Sync Status Indicator */}
        <SyncStatusIndicator />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative rounded-full p-1.5 sm:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors tap-target outline-none"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 ring-1 sm:ring-2 ring-white animate-pulse" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50/50">
              <DropdownMenuLabel className="p-0 font-bold text-gray-900">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Loading...
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors focus:bg-gray-50/80 ${!notification.isRead ? 'bg-blue-50/40' : ''}`}
                      onSelect={(e) => {
                        e.preventDefault(); // Prevent menu from closing if we handle clicking specifically
                        handleNotificationClick(notification.id, notification.isRead);
                      }}
                    >
                      <div className="flex justify-between w-full gap-2">
                        <span className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                          {notification.title}
                        </span>
                        {!notification.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
                      </div>
                      <span className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{notification.body}</span>
                      <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 font-medium">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">No notifications</p>
                  <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
            <div className="border-t">
              <Link
                href="/pos/notifications"
                className="flex items-center justify-center p-3 text-sm text-blue-600 font-semibold hover:bg-gray-50 transition-colors"
                onClick={() => { }} // Could mark all as read here or just navigate
              >
                View All Notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <div className="flex items-center border-l border-gray-200 ml-1.5 sm:ml-2 pl-1.5 sm:pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 p-1 rounded-lg transition-colors outline-none">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(session?.user as any)?.role || 'Staff Member'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/pos/profile" className="cursor-pointer w-full flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pos/settings" className="cursor-pointer w-full flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/pos/billing" className="cursor-pointer w-full flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/signin' })}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
