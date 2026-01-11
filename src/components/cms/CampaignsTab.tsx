'use client'

import { useState, useEffect } from 'react'
import { Plus, Send, Edit, Trash2, Eye, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  subject: string
  campaignType: string
  status: string
  recipientCount: number
  sentCount: number
  openedCount: number
  clickedCount: number
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
}

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [sending, setSending] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    previewText: '',
    emailBody: '',
    campaignType: 'PROMOTIONAL',
    targetTags: [] as string[],
    minTotalSpent: '',
    minVisitCount: '',
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pos/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    try {
      const res = await fetch('/api/pos/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          minTotalSpent: formData.minTotalSpent ? parseFloat(formData.minTotalSpent) : undefined,
          minVisitCount: formData.minVisitCount ? parseInt(formData.minVisitCount) : undefined,
        }),
      })

      if (res.ok) {
        toast.success('Campaign created successfully')
        setShowDialog(false)
        fetchCampaigns()
        // Reset form
        setFormData({
          name: '',
          subject: '',
          previewText: '',
          emailBody: '',
          campaignType: 'PROMOTIONAL',
          targetTags: [],
          minTotalSpent: '',
          minVisitCount: '',
        })
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Failed to create campaign:', error)
      toast.error('Failed to create campaign')
    }
  }

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign? This cannot be undone.')) {
      return
    }

    try {
      setSending(true)
      const res = await fetch('/api/pos/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Campaign sent to ${data.sentCount} customers`)
        fetchCampaigns()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Failed to send campaign:', error)
      toast.error('Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      SENDING: 'bg-yellow-100 text-yellow-800',
      SENT: 'bg-green-100 text-green-800',
      PAUSED: 'bg-orange-100 text-orange-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return <div className="text-center py-8">Loading campaigns...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Email Campaigns</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first email campaign to engage with your customers
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Campaign
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-gray-600 mb-2">{campaign.subject}</p>
                  <div className="flex gap-6 text-sm text-gray-500">
                    <span>Type: {campaign.campaignType}</span>
                    <span>Recipients: {campaign.recipientCount}</span>
                    {campaign.sentCount > 0 && (
                      <>
                        <span>Sent: {campaign.sentCount}</span>
                        <span>
                          Opens: {campaign.openedCount} (
                          {campaign.sentCount > 0
                            ? Math.round((campaign.openedCount / campaign.sentCount) * 100)
                            : 0}
                          %)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {campaign.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      onClick={() => handleSendCampaign(campaign.id)}
                      disabled={sending}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Sale 2026"
              />
            </div>

            <div>
              <Label>Campaign Type</Label>
              <Select
                value={formData.campaignType}
                onValueChange={(value) => setFormData({ ...formData, campaignType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                  <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                  <SelectItem value="ANNIVERSARY">Anniversary</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="NEWSLETTER">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Email Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter email subject line"
              />
            </div>

            <div>
              <Label>Preview Text (Optional)</Label>
              <Input
                value={formData.previewText}
                onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                placeholder="Text shown in email preview"
              />
            </div>

            <div>
              <Label>Email Body</Label>
              <Textarea
                value={formData.emailBody}
                onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                placeholder="Use {customer_name}, {coupon_code}, {discount_value} as variables"
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{customer_name}'}, {'{coupon_code}'}, {'{discount_value}'}
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Targeting (Optional)</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Total Spent</Label>
                  <Input
                    type="number"
                    value={formData.minTotalSpent}
                    onChange={(e) => setFormData({ ...formData, minTotalSpent: e.target.value })}
                    placeholder="e.g., 1000"
                  />
                </div>

                <div>
                  <Label>Minimum Visit Count</Label>
                  <Input
                    type="number"
                    value={formData.minVisitCount}
                    onChange={(e) => setFormData({ ...formData, minVisitCount: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
