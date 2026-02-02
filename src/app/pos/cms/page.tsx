/**
 * EMAIL CAMPAIGN / CMS FEATURE - CURRENTLY DISABLED
 * 
 * This feature is not important for now and has been temporarily hidden.
 * 
 * Status:
 * - ✅ Database schema implemented (EmailCampaign, EmailCampaignRecipient, POSCouponCode)
 * - ✅ Frontend UI complete (CampaignsTab, CouponsTab, SegmentsTab, AnalyticsTab)
 * - ✅ Email sending logic implemented (/api/pos/campaigns/send)
 * - ❌ CRUD API endpoints not implemented (placeholder only)
 * 
 * To re-enable: Uncomment the code below and implement the missing API endpoints.
 */

'use client'

// import { useState } from 'react'
// import { Mail, Tag, Users, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import CampaignsTab from '@/components/cms/CampaignsTab'
// import CouponsTab from '@/components/cms/CouponsTab'
// import SegmentsTab from '@/components/cms/SegmentsTab'
// import AnalyticsTab from '@/components/cms/AnalyticsTab'

export default function CMSPage() {
  // const [activeTab, setActiveTab] = useState('campaigns')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Email Campaign Feature
            </h1>
            <p className="text-gray-600 mb-4">
              This feature is currently disabled as it's not a priority at the moment.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900 font-semibold mb-2">Feature Status:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Database models ready</li>
                <li>✅ Frontend UI complete</li>
                <li>✅ Email sending logic implemented</li>
                <li>❌ API endpoints pending</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  /* ORIGINAL CODE - COMMENTED OUT FOR NOW
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management System</h1>
          <p className="text-gray-600">
            Engage your customers with personalized emails and targeted promotions
          </p>
        </div>

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
  
  */
}
