{/*responsive mobile*/}

'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp, Mail, Tag, Users } from 'lucide-react'

export default function AnalyticsTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Analytics & Insights</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Campaign Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Email Campaign Performance</h3>
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Emails Sent</span>
              <span className="text-2xl font-bold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Open Rate</span>
              <span className="text-2xl font-bold text-green-600">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Click Rate</span>
              <span className="text-2xl font-bold text-blue-600">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Unsubscribe Rate</span>
              <span className="text-2xl font-bold text-red-600">0%</span>
            </div>
          </div>
        </Card>

        {/* Coupon Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Coupon Performance</h3>
            <Tag className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Coupons</span>
              <span className="text-2xl font-bold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Redemptions</span>
              <span className="text-2xl font-bold text-green-600">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Discount Given</span>
              <span className="text-2xl font-bold text-orange-600">₹0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue from Coupons</span>
              <span className="text-2xl font-bold text-blue-600">₹0</span>
            </div>
          </div>
        </Card>

        {/* Customer Engagement */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Customer Engagement</h3>
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Customers</span>
              <span className="text-2xl font-bold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Opted In for Marketing</span>
              <span className="text-2xl font-bold text-green-600">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Verified Emails</span>
              <span className="text-2xl font-bold text-blue-600">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Unsubscribed</span>
              <span className="text-2xl font-bold text-red-600">0</span>
            </div>
          </div>
        </Card>

        {/* Growth Metrics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Growth Metrics</h3>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Repeat Customer Rate</span>
              <span className="text-2xl font-bold text-green-600">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Customer Lifetime Value</span>
              <span className="text-2xl font-bold text-blue-600">₹0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Campaign ROI</span>
              <span className="text-2xl font-bold text-purple-600">0%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Coupon Conversion Rate</span>
              <span className="text-2xl font-bold text-orange-600">0%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-4">Top Performing Coupons</h3>
        <div className="text-center py-8 text-gray-500">
          No coupon data available yet. Create and use coupons to see analytics here.
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-4">Recent Campaign Activity</h3>
        <div className="text-center py-8 text-gray-500">
          No campaign activity yet. Send campaigns to see analytics here.
        </div>
      </Card>
    </div>
  )
}
