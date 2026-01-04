'use client'

import { Star, Gift, Minus } from 'lucide-react'
import { useState } from 'react'

interface LoyaltyPointsCardProps {
    customerId: string
    currentPoints: number
    pointsEarned: number // Points to be earned on current Sale
    onRedeem: (points: number) => void
    maxRedeemable: number // Max points that can be redeemed for this sale
}

export default function LoyaltyPointsCard({
    customerId,
    currentPoints,
    pointsEarned,
    onRedeem,
    maxRedeemable
}: LoyaltyPointsCardProps) {
    const [redeemPoints, setRedeemPoints] = useState(0)
    const [isRedeeming, setIsRedeeming] = useState(false)

    // 1 point = ₹1 value for simplicity
    const pointValue = 1
    const maxRedeemPoints = Math.min(currentPoints, maxRedeemable)

    const handleRedeem = () => {
        if (redeemPoints > 0 && redeemPoints <= maxRedeemPoints) {
            onRedeem(redeemPoints)
            setIsRedeeming(false)
        }
    }

    const handleQuickRedeem = (points: number) => {
        setRedeemPoints(Math.min(points, maxRedeemPoints))
    }

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                        <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-700">Available Points</p>
                        <p className="text-lg font-bold text-amber-800">{currentPoints}</p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-green-600">+{pointsEarned} pts on this sale</p>
                    {currentPoints > 0 && !isRedeeming && (
                        <button
                            onClick={() => setIsRedeeming(true)}
                            className="text-xs text-amber-700 hover:text-amber-800 font-medium mt-1 flex items-center gap-1"
                        >
                            <Gift className="h-3 w-3" />
                            Redeem
                        </button>
                    )}
                </div>
            </div>

            {isRedeeming && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-amber-700">Redeem Points:</span>
                        <input
                            type="number"
                            value={redeemPoints || ''}
                            onChange={(e) => setRedeemPoints(Math.min(parseInt(e.target.value) || 0, maxRedeemPoints))}
                            max={maxRedeemPoints}
                            min={0}
                            className="w-20 px-2 py-1 text-sm border border-amber-300 rounded focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-xs text-amber-600">= ₹{(redeemPoints * pointValue).toFixed(0)}</span>
                    </div>

                    {/* Quick Redeem Options */}
                    <div className="flex gap-2 mb-2">
                        {[50, 100, 200].filter(p => p <= maxRedeemPoints).map(points => (
                            <button
                                key={points}
                                onClick={() => handleQuickRedeem(points)}
                                className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                            >
                                {points}
                            </button>
                        ))}
                        <button
                            onClick={() => handleQuickRedeem(maxRedeemPoints)}
                            className="px-2 py-1 text-xs bg-amber-200 text-amber-800 rounded hover:bg-amber-300"
                        >
                            Max ({maxRedeemPoints})
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setIsRedeeming(false)
                                setRedeemPoints(0)
                            }}
                            className="flex-1 py-1.5 text-xs border border-amber-300 rounded font-medium text-amber-700 hover:bg-amber-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRedeem}
                            disabled={redeemPoints <= 0}
                            className="flex-1 py-1.5 text-xs bg-amber-500 text-white rounded font-medium hover:bg-amber-600 disabled:bg-gray-300 flex items-center justify-center gap-1"
                        >
                            <Minus className="h-3 w-3" />
                            Use {redeemPoints} pts
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
