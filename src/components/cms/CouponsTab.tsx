'use client'

import { useState, useEffect } from 'react'
import { Plus, Copy, Edit, Trash2, Tag } from 'lucide-react'
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

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  maxDiscount: number | null
  minPurchase: number | null
  perCustomerLimit: number | null
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  validFrom: string
  validUntil: string | null
  createdAt: string
}

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    maxDiscount: '',
    minPurchase: '',
    perCustomerLimit: '1',
    usageLimit: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
  })

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/pos/coupons?status=all')
      if (res.ok) {
        const data = await res.json()
        setCoupons(data.coupons || [])
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to load coupons')
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCoupon = async () => {
    try {
      const res = await fetch('/api/pos/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: parseFloat(formData.discountValue),
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
          minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
          perCustomerLimit: formData.perCustomerLimit ? parseInt(formData.perCustomerLimit) : undefined,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
          validUntil: formData.validUntil || undefined,
        }),
      })

      if (res.ok) {
        toast.success('Coupon created successfully')
        setShowDialog(false)
        fetchCoupons()
        // Reset form
        setFormData({
          code: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          maxDiscount: '',
          minPurchase: '',
          perCustomerLimit: '1',
          usageLimit: '',
          validFrom: new Date().toISOString().split('T')[0],
          validUntil: '',
        })
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create coupon')
      }
    } catch (error) {
      console.error('Failed to create coupon:', error)
      toast.error('Failed to create coupon')
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Coupon code copied to clipboard')
  }

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false
    return new Date(validUntil) < new Date()
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'PERCENTAGE') {
      return `${value}% OFF`
    }
    return `₹${value} OFF`
  }

  if (loading) {
    return <div className="text-center py-8">Loading coupons...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Coupon Codes</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No coupons yet</h3>
          <p className="text-gray-600 mb-6">
            Create discount codes to incentivize purchases and reward loyal customers
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Coupon
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded">
                      {coupon.code}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCouponCode(coupon.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-gray-600 mt-1">{coupon.description}</p>
                  )}
                </div>
                <Badge
                  className={
                    isExpired(coupon.validUntil)
                      ? 'bg-red-100 text-red-800'
                      : coupon.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                  }
                >
                  {isExpired(coupon.validUntil) ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold">
                    {formatDiscount(coupon.discountType, coupon.discountValue)}
                  </span>
                </div>

                {coupon.minPurchase > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min. Purchase:</span>
                    <span className="font-semibold">₹{coupon.minPurchase}</span>
                  </div>
                )}

                {coupon.maxDiscount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Discount:</span>
                    <span className="font-semibold">₹{coupon.maxDiscount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-semibold">
                    {coupon.usageCount}
                    {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                  </span>
                </div>

                {coupon.perCustomerLimit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Per Customer:</span>
                    <span className="font-semibold">{coupon.perCustomerLimit}x</span>
                  </div>
                )}

                {coupon.validUntil && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-semibold">
                      {new Date(coupon.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Coupon Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Coupon Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., SUMMER2026"
                />
                <p className="text-xs text-gray-500 mt-1">Use uppercase letters and numbers</p>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this coupon is for"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => setFormData({ ...formData, discountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '100'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum Purchase (Optional)</Label>
                <Input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>

              {formData.discountType === 'PERCENTAGE' && (
                <div>
                  <Label>Max Discount (Optional)</Label>
                  <Input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="e.g., 200"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usage Per Customer (Optional)</Label>
                <Input
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, perCustomerLimit: e.target.value })
                  }
                  placeholder="1"
                />
              </div>

              <div>
                <Label>Total Usage Limit (Optional)</Label>
                <Input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valid From</Label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>

              <div>
                <Label>Valid Until (Optional)</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCoupon}>Create Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
