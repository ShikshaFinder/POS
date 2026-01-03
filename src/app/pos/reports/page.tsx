'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and download sales reports
        </p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Sales</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Detailed breakdown of today's sales transactions
          </p>
          <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Generate Report
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Weekly Summary</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Sales summary for the current week
          </p>
          <button className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Generate Report
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Monthly Report</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Comprehensive monthly sales and stock report
          </p>
          <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No reports generated yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Generate your first report to see it here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
