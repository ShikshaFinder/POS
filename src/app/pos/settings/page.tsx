'use client'

import { useSession } from 'next-auth/react'
import { Settings as SettingsIcon, User, Building, Store } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your POS settings and preferences
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.name || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.email || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900">{(session?.user as any)?.role || 'Staff'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Organization</label>
            <p className="mt-1 text-sm text-gray-900">{(session?.user as any)?.organizationName || 'Flavi POS'}</p>
          </div>
        </div>
      </div>

      {/* POS Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Store className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">POS Configuration</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Receipt Printing</p>
              <p className="text-xs text-gray-500">Enable thermal printer integration</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                disabled
              />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Barcode Scanner</p>
              <p className="text-xs text-gray-500">Enable barcode scanning for quick checkout</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                disabled
              />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Offline Mode</p>
              <p className="text-xs text-gray-500">Allow sales when internet is unavailable</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                disabled
              />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <SettingsIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Configuration Notice</h3>
            <p className="text-xs text-blue-700 mt-1">
              Advanced settings like printer configuration, barcode scanner setup, and offline mode
              will be available in future updates. Contact your administrator for custom configuration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
