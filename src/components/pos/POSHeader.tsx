'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, User, LogOut } from 'lucide-react'

export function POSHeader() {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Current Time & Date */}
      <div className="flex items-center gap-4">
        <div>
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
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Menu */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {(session?.user as any)?.role || 'Staff'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="rounded-full p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
