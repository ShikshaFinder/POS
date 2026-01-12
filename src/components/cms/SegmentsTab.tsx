'use client'

import { useState, useEffect } from 'react'
import { Plus, Users } from 'lucide-react'
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
import { toast } from 'sonner'

interface Segment {
  id: string
  name: string
  description: string | null
  color: string | null
  isDynamic: boolean
  memberCount: number
  createdAt: string
  _count: {
    members: number
  }
}

export default function SegmentsTab() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    minSpent: '',
    minVisits: '',
  })

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pos/segments')
      if (res.ok) {
        const data = await res.json()
        setSegments(data.segments || [])
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to load segments')
      }
    } catch (error) {
      console.error('Failed to fetch segments:', error)
      toast.error('Failed to load segments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSegment = async () => {
    try {
      const criteria: any = {}
      if (formData.minSpent) {
        criteria.minSpent = parseFloat(formData.minSpent)
      }
      if (formData.minVisits) {
        criteria.minVisits = parseInt(formData.minVisits)
      }

      const res = await fetch('/api/pos/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          criteria,
          isDynamic: true,
        }),
      })

      if (res.ok) {
        toast.success('Segment created successfully')
        setShowDialog(false)
        fetchSegments()
        // Reset form
        setFormData({
          name: '',
          description: '',
          color: '#3B82F6',
          minSpent: '',
          minVisits: '',
        })
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create segment')
      }
    } catch (error) {
      console.error('Failed to create segment:', error)
      toast.error('Failed to create segment')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading segments...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Customer Segments</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      {segments.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No segments yet</h3>
          <p className="text-gray-600 mb-6">
            Create customer segments to target specific groups with personalized campaigns
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Segment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <Card key={segment.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: segment.color || '#3B82F6' }}
                />
                <Badge>{segment.isDynamic ? 'Dynamic' : 'Static'}</Badge>
              </div>

              <h3 className="font-semibold text-lg mb-2">{segment.name}</h3>
              {segment.description && (
                <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Members</span>
                <span className="font-bold text-lg">{segment._count.members}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Segment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Customer Segment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Segment Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP Customers"
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this segment"
                rows={3}
              />
            </div>

            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Criteria</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Total Spent</Label>
                  <Input
                    type="number"
                    value={formData.minSpent}
                    onChange={(e) => setFormData({ ...formData, minSpent: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>

                <div>
                  <Label>Minimum Visits</Label>
                  <Input
                    type="number"
                    value={formData.minVisits}
                    onChange={(e) => setFormData({ ...formData, minVisits: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                This segment will automatically update as customers meet the criteria
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSegment}>Create Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
