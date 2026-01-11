# Customer Management System (CMS) for POS Owners

## Overview

The Customer Management System (CMS) is a powerful tool designed to help POS owners increase repeat customers through personalized email campaigns and targeted promotions. This system allows you to engage with your customers, reward loyalty, and drive sales growth.

## Features

### 1. **Email Campaigns**
Send personalized email campaigns to your customers to keep them engaged and informed about your latest offers.

**Use Cases:**
- **Promotional Campaigns**: Announce sales, new products, or special events
- **Birthday Campaigns**: Send personalized birthday wishes with special discounts
- **Anniversary Campaigns**: Celebrate customer anniversaries with exclusive offers
- **Follow-up Campaigns**: Re-engage inactive customers
- **Newsletters**: Keep customers informed about your business

**Key Features:**
- Target specific customer segments based on spending, visit frequency, and tags
- Use template variables like `{customer_name}`, `{coupon_code}`, `{discount_value}`
- Track email opens, clicks, and unsubscribes
- Schedule campaigns for future delivery

### 2. **Coupon Codes**
Create and manage discount codes to incentivize purchases and reward loyal customers.

**Coupon Types:**
- **Percentage Discount**: e.g., 10% off
- **Fixed Amount Discount**: e.g., ₹100 off

**Coupon Features:**
- Set minimum purchase requirements
- Define maximum discount caps (for percentage coupons)
- Set usage limits per customer
- Set total usage limits across all customers
- Define validity date ranges
- Target specific products or categories
- Track redemptions and revenue

**Example Coupons:**
- `WELCOME10` - 10% off for new customers (max ₹200 discount)
- `VIP500` - ₹500 off for customers who spent ₹5000+ (limited to 50 redemptions)
- `BIRTHDAY20` - 20% off for birthday month

### 3. **Customer Segments**
Group customers based on behavior and characteristics for targeted marketing.

**Segment Types:**
- **Dynamic Segments**: Automatically update based on criteria
- **Static Segments**: Manually managed lists

**Segment Criteria:**
- Minimum total spent
- Minimum visit count
- Customer tags (VIP, FREQUENT_BUYER, etc.)
- Last visit date
- Marketing consent status

**Example Segments:**
- **VIP Customers**: Spent ₹10,000+, 10+ visits
- **At-Risk Customers**: Haven't visited in 60+ days
- **High Spenders**: Spent ₹5,000+ but less than 10 visits
- **New Customers**: 1-3 visits, registered in last 30 days

### 4. **Analytics Dashboard**
Track the performance of your campaigns and coupons to optimize your marketing efforts.

**Metrics Available:**
- Email campaign performance (open rate, click rate, unsubscribe rate)
- Coupon redemption rates and revenue impact
- Customer engagement levels
- Repeat customer rates
- Customer lifetime value
- Campaign ROI

## Getting Started

### Step 1: Enable Marketing Consent

Before sending emails to customers, ensure they have opted in for marketing communications:

1. When adding or editing a customer, check the "Marketing Consent" checkbox
2. Verify their email address
3. Set their preferred contact time (Morning/Afternoon/Evening)
4. Set email frequency preference (Daily/Weekly/Monthly/Never)

### Step 2: Create Your First Coupon

1. Navigate to **POS → CMS → Coupons tab**
2. Click **Create Coupon**
3. Fill in the coupon details:
   - **Code**: Use uppercase letters and numbers (e.g., SUMMER2026)
   - **Name**: Internal name for your reference
   - **Description**: Customer-facing description
   - **Discount Type**: Percentage or Fixed Amount
   - **Discount Value**: The discount amount
   - **Minimum Purchase**: Optional minimum order amount
   - **Usage Limits**: How many times it can be used
   - **Validity Dates**: When the coupon is valid
4. Click **Create Coupon**

### Step 3: Create an Email Campaign

1. Navigate to **POS → CMS → Campaigns tab**
2. Click **Create Campaign**
3. Fill in campaign details:
   - **Name**: Internal campaign name
   - **Type**: Select campaign type
   - **Subject**: Email subject line
   - **Preview Text**: Optional preview text
   - **Email Body**: Write your email content
4. Use template variables:
   - `{customer_name}` - Customer's name
   - `{coupon_code}` - Coupon code (if attached)
   - `{discount_value}` - Discount value (if coupon attached)
   - `{organization_name}` - Your business name
5. Set targeting criteria (optional):
   - Minimum total spent
   - Minimum visit count
   - Customer tags
6. Click **Create Campaign**
7. Review the campaign and click **Send** when ready

### Step 4: Create Customer Segments

1. Navigate to **POS → CMS → Segments tab**
2. Click **Create Segment**
3. Define segment details:
   - **Name**: Segment name (e.g., "VIP Customers")
   - **Description**: Optional description
   - **Color**: Choose a color for visual identification
4. Set criteria:
   - Minimum spent amount
   - Minimum visit count
   - Other criteria
5. Click **Create Segment**

The segment will automatically populate with customers matching your criteria.

## Best Practices

### Email Campaigns

1. **Personalization is Key**
   - Always use `{customer_name}` to personalize emails
   - Reference their purchase history when relevant
   - Segment your audience for targeted messaging

2. **Timing Matters**
   - Send emails at optimal times (check customer preferences)
   - Avoid sending too frequently (respect email frequency settings)
   - Schedule campaigns for special occasions (birthdays, anniversaries)

3. **Clear Call-to-Action**
   - Include a clear coupon code
   - Explain the offer clearly
   - Add urgency (limited time offer)

4. **Test Before Sending**
   - Review your email for typos
   - Verify template variables are correct
   - Check targeting criteria

### Coupon Codes

1. **Make Codes Memorable**
   - Use simple, easy-to-remember codes
   - Relate codes to the promotion (SUMMER20, BIRTHDAY15)
   - Avoid confusing characters (0 vs O, 1 vs I)

2. **Set Appropriate Limits**
   - Use usage limits to control costs
   - Set expiry dates to create urgency
   - Consider minimum purchase requirements for larger discounts

3. **Track Performance**
   - Monitor redemption rates
   - Calculate ROI (revenue vs discount given)
   - Adjust future campaigns based on data

### Customer Engagement

1. **Build Your Email List**
   - Encourage customers to opt-in at checkout
   - Offer a welcome discount for email sign-ups
   - Make it easy to unsubscribe (maintain trust)

2. **Segment Strategically**
   - Create segments for different customer behaviors
   - Target high-value customers differently
   - Re-engage inactive customers with special offers

3. **Respect Privacy**
   - Honor unsubscribe requests immediately
   - Never share customer data
   - Be transparent about email frequency

## Example Campaign Ideas

### Welcome Campaign
**Target**: New customers (1-2 visits)
**Subject**: "Welcome to [Your Store]! Enjoy 10% OFF Your Next Visit"
**Coupon**: WELCOME10 (10% off, max ₹200, valid 30 days)

### Re-engagement Campaign
**Target**: Customers who haven't visited in 60+ days
**Subject**: "We Miss You! Here's 15% OFF to Welcome You Back"
**Coupon**: COMEBACK15 (15% off, max ₹300, valid 14 days)

### VIP Appreciation Campaign
**Target**: Customers who spent ₹10,000+
**Subject**: "Thank You for Being Our VIP! Exclusive ₹500 OFF"
**Coupon**: VIP500 (₹500 off on ₹2000+ purchase, valid 30 days)

### Birthday Campaign
**Target**: Customers with birthdays this month
**Subject**: "Happy Birthday {customer_name}! 🎂 Enjoy 20% OFF"
**Coupon**: BIRTHDAY20 (20% off, max ₹500, valid 7 days)

## Technical Requirements

### Email Configuration

To send emails, ensure your Resend API key is configured in your environment variables:

```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Customer Data Requirements

For email campaigns to work effectively, ensure customers have:
- Valid email addresses
- Marketing consent enabled
- Email verified status
- Appropriate customer tags (if targeting by tags)

## Support

If you encounter any issues or have questions:
1. Check the Analytics tab for campaign performance data
2. Review error messages in campaign status
3. Ensure customers have valid, verified email addresses
4. Contact your system administrator for technical issues

## Future Enhancements

Planned features for future releases:
- SMS campaign support
- WhatsApp campaign integration
- A/B testing for email subject lines
- Automated campaign workflows (abandoned cart, etc.)
- Advanced analytics and reporting
- Email template library
- Drag-and-drop email builder

---

**Remember**: The key to successful customer engagement is consistency, personalization, and respect for your customers' preferences. Use these tools wisely to build lasting relationships with your customers!
