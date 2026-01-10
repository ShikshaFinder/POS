'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, User, LogOut } from 'lucide-react'
import SyncStatusIndicator from './SyncStatusIndicator'

export function POSHeader() {
  const { data: session } = useSession()

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-6 flex-shrink-0 safe-top">
      {/* Current Time & Date */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
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
        
        {/* Mobile: Show only date */}
        <div className="md:hidden">
          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
            {new Date().toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric'
            })}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            {new Date().toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1.5 sm:gap-4">
        {/* Sync Status Indicator */}
        <SyncStatusIndicator />

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-full p-1.5 sm:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors tap-target"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 ring-1 sm:ring-2 ring-white" />
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 border-l border-gray-200 pl-2 sm:pl-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {(session?.user as any)?.role || 'Staff'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="rounded-full p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors tap-target"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
