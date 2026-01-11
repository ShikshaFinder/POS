import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Constants for email sending configuration
const EMAIL_BATCH_SIZE = 10
const MAX_EMAILS_PER_SEND = 100

// POST /api/pos/campaigns/send - Send email campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await req.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Get the campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
        posLocation: {
          select: {
            name: true,
          },
        },
        couponCode: {
          select: {
            code: true,
            discountType: true,
            discountValue: true,
            validUntil: true,
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check authorization
    if (campaign.organizationId !== session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if campaign is already sent
    if (campaign.status === 'SENT') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
    }

    // Build customer targeting query
    const customerWhere: any = {
      organizationId: campaign.organizationId,
      marketingConsent: true,
      emailVerified: true,
      email: { not: null },
      unsubscribedAt: null,
    }

    if (campaign.posLocationId) {
      customerWhere.posLocationId = campaign.posLocationId
    }

    if (campaign.targetTags && campaign.targetTags.length > 0) {
      customerWhere.tags = { hasSome: campaign.targetTags }
    }

    if (campaign.minTotalSpent) {
      customerWhere.totalSpent = { gte: campaign.minTotalSpent }
    }

    if (campaign.maxTotalSpent) {
      customerWhere.totalSpent = {
        ...customerWhere.totalSpent,
        lte: campaign.maxTotalSpent,
      }
    }

    if (campaign.minVisitCount) {
      customerWhere.visitCount = { gte: campaign.minVisitCount }
    }

    // Get target customers
    const customers = await prisma.pOSCustomer.findMany({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No customers found matching criteria' },
        { status: 400 }
      )
    }

    // Update campaign status to SENDING
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        recipientCount: customers.length,
      },
    })

    // Create recipient records
    const recipientData = customers.map((customer) => ({
      campaignId: campaign.id,
      customerId: customer.id,
      status: 'PENDING',
    }))

    await prisma.emailCampaignRecipient.createMany({
      data: recipientData,
    })

    // Send emails (in batches to avoid rate limits)
    let sentCount = 0
    let errorCount = 0

    // Process in background (in production, use a queue service like BullMQ or Inngest)
    // For now, we'll do it synchronously with a limit
    for (let i = 0; i < Math.min(customers.length, MAX_EMAILS_PER_SEND); i += EMAIL_BATCH_SIZE) {
      const batch = customers.slice(i, i + EMAIL_BATCH_SIZE)
      
      await Promise.all(
        batch.map(async (customer) => {
          try {
            // Replace template variables in email body
            let personalizedBody = campaign.emailBody
              .replace(/\{customer_name\}/g, customer.name)
              .replace(/\{organization_name\}/g, campaign.organization.name)

            if (campaign.couponCode) {
              personalizedBody = personalizedBody
                .replace(/\{coupon_code\}/g, campaign.couponCode.code)
                .replace(
                  /\{discount_value\}/g,
                  campaign.couponCode.discountType === 'PERCENTAGE'
                    ? `${campaign.couponCode.discountValue}%`
                    : `₹${campaign.couponCode.discountValue}`
                )
            }

            // Send email using Resend
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
              to: customer.email!,
              subject: campaign.subject,
              html: personalizedBody,
            })

            // Update recipient status
            await prisma.emailCampaignRecipient.updateMany({
              where: {
                campaignId: campaign.id,
                customerId: customer.id,
              },
              data: {
                status: 'SENT',
                sentAt: new Date(),
              },
            })

            // Update customer lastEmailSent
            await prisma.pOSCustomer.update({
              where: { id: customer.id },
              data: {
                lastEmailSent: new Date(),
              },
            })

            sentCount++
          } catch (error) {
            console.error(`Failed to send email to ${customer.email}:`, error)
            errorCount++

            // Update recipient with error
            await prisma.emailCampaignRecipient.updateMany({
              where: {
                campaignId: campaign.id,
                customerId: customer.id,
              },
              data: {
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
              },
            })
          }
        })
      )
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentCount,
        errorCount,
      },
    })

    return NextResponse.json({
      success: true,
      sentCount,
      errorCount,
      totalRecipients: customers.length,
    })
  } catch (error) {
    console.error('Failed to send campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}
