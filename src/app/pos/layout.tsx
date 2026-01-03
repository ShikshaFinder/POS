'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { POSNav } from '@/components/pos/POSNav'
import { POSHeader } from '@/components/pos/POSHeader'

export default function POSLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Navigation */}
      <POSNav />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <POSHeader />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
