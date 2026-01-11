'use client'

import { useState } from 'react'
import { Mail, Tag, Users, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CampaignsTab from '@/components/cms/CampaignsTab'
import CouponsTab from '@/components/cms/CouponsTab'
import SegmentsTab from '@/components/cms/SegmentsTab'
import AnalyticsTab from '@/components/cms/AnalyticsTab'

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState('campaigns')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management System</h1>
          <p className="text-gray-600">
            Engage your customers with personalized emails and targeted promotions
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Mail className="h-10 w-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Coupons</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Tag className="h-10 w-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer Segments</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Email Open Rate</p>
                <p className="text-2xl font-bold">0%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="campaigns">
                <Mail className="h-4 w-4 mr-2" />
                Email Campaigns
              </TabsTrigger>
              <TabsTrigger value="coupons">
                <Tag className="h-4 w-4 mr-2" />
                Coupons
              </TabsTrigger>
              <TabsTrigger value="segments">
                <Users className="h-4 w-4 mr-2" />
                Segments
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns">
              <CampaignsTab />
            </TabsContent>

            <TabsContent value="coupons">
              <CouponsTab />
            </TabsContent>

            <TabsContent value="segments">
              <SegmentsTab />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
