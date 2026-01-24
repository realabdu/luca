Luca Insight Platform Specification
Version: 0.2.0-draft
Last Updated: 2025-01-18
Status: Draft - Awaiting Review

1. Problem Statement
Marketing teams at e-commerce stores face three core problems:

Fragmentation - Managing multiple ad accounts (Meta, Snapchat, TikTok, Google) across platforms requires constant context-switching, manual filter setup, and aggregation of spend/performance data.
Inaccurate Attribution - Apple's App Tracking Transparency (ATT) blocks third-party pixels. Snapchat, TikTok, and Meta report inflated or incomplete conversion data because their pixels can't track cross-device or post-ATT users.
Incorrect ROAS Calculation - Most tools calculate ROAS from gross revenue. Actual profitability requires accounting for refunds, returns, discounts, COGS, shipping, and payment gateway fees.

Target Market: E-commerce stores in Saudi Arabia and MENA region using Zid, Salla, and Shopify.

2. Solution Overview
Luca Insight provides:

Unified Dashboard - Single view of all ad platform performance with accurate, blended metrics
First-Party Pixel (Luca Pixel) - Server-side tracking that bypasses ATT restrictions for accurate attribution
Native Integrations - Direct API connections to Zid, Salla for ground-truth order data
True Profitability Metrics - ROAS, Net Profit, MER calculated with refunds, returns, and all expenses


3. Data Model
3.1 Core Entities
yamlOrder:
  id: string (from source platform)
  source: enum [zid, salla, shopify]
  customer_id: string
  is_new_customer: boolean
  order_date: datetime
  status: enum [pending, confirmed, shipped, delivered, cancelled, refunded]
  
  # Revenue components
  gross_sales: decimal        # Product revenue before any deductions
  shipping_collected: decimal # Shipping charged to customer
  taxes_collected: decimal    # Tax charged to customer
  discounts_applied: decimal  # Total discount value
  
  # Refund components (populated on refund date, not order date)
  refund_date: datetime | null
  refunded_sales: decimal
  refunded_shipping: decimal
  refunded_taxes: decimal
  
  # Cost components
  cogs: decimal               # Cost of goods sold
  shipping_cost: decimal      # Actual shipping cost to merchant
  handling_cost: decimal      # Fulfillment/handling fees
  payment_gateway_fee: decimal # Stripe, Tap, etc.
  
  # Attribution
  attributed_channel: string | null
  attribution_click_id: string | null
  attribution_timestamp: datetime | null

AdSpend:
  id: string
  platform: enum [meta, snapchat, tiktok, google, custom]
  account_id: string
  campaign_id: string
  adset_id: string | null
  ad_id: string | null
  date: date
  spend: decimal
  currency: string
  impressions: integer
  clicks: integer
  platform_reported_conversions: integer
  platform_reported_revenue: decimal

CustomExpense:
  id: string
  name: string
  date: date
  amount: decimal
  is_ad_spend: boolean        # If true, included in Blended Ad Spend
  category: enum [marketing, operations, software, other]

Attribution:
  id: string
  order_id: string
  channel: string
  click_id: string
  click_timestamp: datetime
  conversion_timestamp: datetime
  attribution_window: enum [1d_click, 7d_click, 28d_click, 1d_view, 7d_view]
  confidence: decimal         # 0-1, based on match quality

Customer:
  id: string
  source: enum [zid, salla, shopify]
  first_order_date: datetime
  total_orders: integer
  total_ltv: decimal
3.2 Time-Based Aggregation Rules
Critical: Revenue and costs use different date bases:
Metric ComponentDate BasisGross SalesOrder DateShipping CollectedOrder DateTaxes CollectedOrder DateDiscountsOrder DateRefunded SalesRefund DateRefunded ShippingRefund DateRefunded TaxesRefund DateAd SpendSpend DateCOGSOrder Date
This means: An order placed Dec 15, refunded Jan 5 → revenue appears in December, refund appears in January.

4. Metric Definitions
4.1 Revenue Metrics
Total Sales
Total Sales = Gross Sales + Shipping Collected + Taxes Collected 
              - Discounts Applied 
              - Refunded Sales - Refunded Shipping - Refunded Taxes
Note: This represents revenue retained by the business. Revenue components use order date; refund components use refund date.
Order Revenue
Order Revenue = Gross Sales - Discounts Applied - Refunded Sales
Used for ROAS calculations. Excludes shipping/taxes as these are pass-through.

4.2 Spend Metrics
Total Ad Spend (Blended)
Blended Ad Spend = Σ(Platform Ad Spend) + Σ(Custom Expenses where is_ad_spend=true)
Platforms: Meta, Snapchat, TikTok, Google Ads, plus any custom ad spend entries.

4.3 Profitability Metrics
Net Profit
Net Profit = Order Revenue 
             - Returns (Refunded Sales)
             - COGS
             - Shipping Cost
             - Handling Cost  
             - Payment Gateway Fees
             - Taxes Remitted
             - Blended Ad Spend
             - Custom Expenses (non-ad-spend)
Net Margin
Net Margin = (Net Profit / Total Sales) × 100
Expressed as percentage.

4.4 Efficiency Metrics
ROAS (Blended)
Blended ROAS = Order Revenue / Blended Ad Spend
Example: $10,000 revenue / $2,000 ad spend = 5.0 ROAS
MER (Marketing Efficiency Ratio)
MER = Blended Ad Spend / Order Revenue
Inverse of ROAS. Example: $2,000 / $10,000 = 0.20 (20%)
Lower is better. Represents "what percentage of revenue goes to ads."
NCPA (New Customer Acquisition Cost)
NCPA = Blended Ad Spend / New Customers Acquired
Where New Customers Acquired = count of orders where is_new_customer = true

5. The Attribution Problem
5.1 Why Platform Data Is Unreliable
Each data source knows only part of the customer journey:
SourceWhat It KnowsWhat It Doesn't KnowSalla/ZidOrders, revenue, refunds, customersWhich ad drove the purchaseSnapchat Ads APISpend, clicks, their "conversions"Real conversions (ATT blocks their pixel)Meta Ads APISpend, clicks, their "conversions"Real conversions (same ATT problem)TikTok Ads APISpend, clicks, their "conversions"Real conversions (same ATT problem)
The result: Snapchat reports 50 conversions. Meta reports 80 conversions. Salla reports 100 orders. The numbers don't add up because ad platforms are guessing—and their guesses overlap.
Luca Insight solves this by using Salla/Zid as the source of truth for orders, and Luca Pixel to connect those orders back to ad clicks.

6. Integration Architecture
┌─────────────────────────────────────────────────────────────────────┐
│                         LUCA INSIGHT                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐       ┌─────────────────────────────────────┐    │
│   │ LUCA PIXEL  │──────→│ Attribution Engine                  │    │
│   │ (1st party) │       │ - Match click_id → order_id         │    │
│   └─────────────┘       │ - Apply attribution window          │    │
│         ↑               │ - Calculate confidence score        │    │
│         │               └─────────────────────────────────────┘    │
│    Click IDs                              │                         │
│    (sccid, fbclid,                        ↓                         │
│     ttclid, gclid)            ┌─────────────────────────┐          │
│                               │ Conversions API         │          │
│                               │ (send accurate data     │          │
│                               │  back to ad platforms)  │          │
│                               └─────────────────────────┘          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  INBOUND DATA                                                       │
│                                                                     │
│  Orders (Ground Truth)         │     Spend Only (Ignore Conversions)│
│  ├── Salla API                 │     ├── Meta Ads API               │
│  ├── Zid API                   │     ├── Snapchat Ads API           │
│  └── Shopify API               │     ├── TikTok Ads API             │
│                                │     └── Google Ads API             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
6.1 Tier 1: Ground Truth (Orders)
These integrations provide the actual order data. This is the source of truth for revenue.
PlatformData RetrievedSync MethodFrequencySallaOrders, Customers, Products, RefundsWebhook + PollingReal-time + 15minZidOrders, Customers, Products, RefundsWebhook + PollingReal-time + 15minShopifyOrders, Customers, Products, RefundsWebhook + PollingReal-time + 15min
Critical: We trust order counts and revenue from these sources, not from ad platforms.
6.2 Tier 2: Ad Spend (Ignore Platform Conversions)
These integrations provide spend data only. We deliberately ignore their reported conversions because they're unreliable post-ATT.
PlatformData RetrievedWhat We IgnoreAuthMeta AdsCampaigns, Ad Sets, Ads, Spend, Impressions, Clicksconversions, purchase_valueOAuth 2.0Snapchat AdsCampaigns, Ad Squads, Ads, Spend, Impressions, Clicksconversions, total_conversion_valueOAuth 2.0TikTok AdsCampaigns, Ad Groups, Ads, Spend, Impressions, Clicksconversions, conversion_valueOAuth 2.0Google AdsCampaigns, Ad Groups, Ads, Spend, Impressions, Clicksconversions, conversion_valueOAuth 2.0
Sync Frequency: Hourly (spend data is not real-time from these APIs)
6.3 Tier 3: Conversions API (Outbound)
After Luca calculates accurate attribution, we send conversion data back to ad platforms. This improves their optimization algorithms.
PlatformAPIPurposeMetaConversions API (CAPI)Send attributed purchases back to MetaSnapchatConversions APISend attributed purchases back to SnapchatTikTokEvents APISend attributed purchases back to TikTokGoogleOffline ConversionsSend attributed purchases back to Google
Why this matters: Ad platforms optimize toward conversions. If we feed them accurate data, their algorithms target better audiences.

7. Luca Pixel
7.1 Why First-Party Tracking Works
Third-party pixels (Meta Pixel, Snap Pixel) fail because:

Apple ATT blocks cross-site tracking
Safari ITP deletes third-party cookies after 24 hours
Ad blockers remove tracking scripts

Luca Pixel works because:

Served from merchant's own domain (first-party)
Data stored in first-party cookies (not blocked by ATT)
Server-side processing (not blocked by ad blockers)

7.2 How Attribution Works
1. User clicks Snapchat ad
   URL: store.com/?sccid=abc123

2. Luca Pixel (on store.com) captures:
   - Click ID: sccid=abc123
   - Timestamp: 2025-01-15 14:32:00
   - Stores in first-party cookie (7-day expiry)

3. User browses, leaves, returns 3 days later, purchases
   
4. Luca Pixel fires on thank-you page:
   - Reads cookie: sccid=abc123
   - Sends to Luca: {order_id: "ORD-789", click_id: "abc123", platform: "snapchat"}

5. Luca Attribution Engine:
   - Receives order ORD-789 from Salla API (revenue: 500 SAR)
   - Matches click_id abc123 from Luca Pixel
   - Verifies: 3 days < 7-day attribution window ✓
   - Result: Order attributed to Snapchat campaign

6. Luca sends to Snapchat CAPI:
   - "Order ORD-789, value 500 SAR, attributed to click abc123"
   - Snapchat's algorithm now knows this click converted
7.3 Click ID Reference
PlatformParameterExampleMetafbclidfbclid=IwAR3x...Snapchatsccidsccid=abc123...TikTokttclidttclid=xyz789...Googlegclidgclid=Cj0KCQ...
7.4 Attribution Windows
WindowUse Case1-day clickConservative, high-intent purchases7-day clickDefault, balances accuracy and coverage28-day clickHigh-consideration purchases1-day viewView-through attribution (impression only)7-day viewExtended view-through
7.5 Fallback Hierarchy
When click ID matching isn't possible:
PriorityMethodConfidenceWhen Used1Click ID match95%+User clicked ad, cookie preserved2UTM parameter match70-85%Click ID stripped, UTMs preserved3Referrer domain50-70%No params, but referrer shows ad platform4Time-decay model30-50%No direct match, probabilistic
7.6 Pixel Implementation
Installation: Single script tag on merchant's site:
html<script src="https://pixel.luca.sa/v1/p.js" data-store-id="STORE_ID"></script>
Events Tracked:
EventTriggerData Capturedpage_viewEvery page loadURL, referrer, click IDs, timestampadd_to_cartAdd to cart actionProduct ID, quantity, valuebegin_checkoutCheckout initiatedCart value, item countpurchaseOrder confirmation pageOrder ID, value, items
Cookie Structure:
json{
  "luca_click": {
    "platform": "snapchat",
    "click_id": "abc123",
    "timestamp": 1705312320,
    "landing_page": "/products/item-1"
  },
  "luca_session": "sess_xyz789"
}

8. Features
8.1 Overview Dashboard
Date Range Selector
Preset Ranges:

Today
Yesterday
Last 7 Days
Last 30 Days
This Week (Mon-Sun)
Last Week
This Month
Last Month
This Quarter
Last Quarter
This Year
Last Year

Custom Range:

Start date picker
End date picker
Compare to previous period toggle

Quick Analytics Cards
CardMetricSourceFormatTotal SalesTotal SalesCalculatedCurrencyAd SpendBlended Ad SpendAggregatedCurrencyNet ProfitNet ProfitCalculatedCurrencyROASBlended ROASCalculatedDecimal (1 place)MERMERCalculatedPercentageNet MarginNet MarginCalculatedPercentageNCPANCPACalculatedCurrency
Each card displays:

Current period value
Comparison to previous period (% change)
Trend indicator (up/down arrow, color-coded)


9. API Specification
9.1 Analytics Endpoint
GET /api/v1/analytics/overview
Query Parameters:
ParamTypeRequiredDescriptionstart_dateISO8601 dateYesPeriod startend_dateISO8601 dateYesPeriod endcomparebooleanNoInclude comparison periodstore_idsstring[]NoFilter by store (default: all)
Response:
json{
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-18"
  },
  "metrics": {
    "total_sales": {
      "value": 150000.00,
      "currency": "SAR",
      "previous_value": 142000.00,
      "change_percent": 5.63
    },
    "blended_ad_spend": {
      "value": 25000.00,
      "currency": "SAR",
      "previous_value": 28000.00,
      "change_percent": -10.71
    },
    "net_profit": {
      "value": 45000.00,
      "currency": "SAR",
      "previous_value": 38000.00,
      "change_percent": 18.42
    },
    "blended_roas": {
      "value": 6.0,
      "previous_value": 5.07,
      "change_percent": 18.34
    },
    "mer": {
      "value": 0.167,
      "previous_value": 0.197,
      "change_percent": -15.23
    },
    "net_margin": {
      "value": 0.30,
      "previous_value": 0.268,
      "change_percent": 11.94
    },
    "ncpa": {
      "value": 125.00,
      "currency": "SAR",
      "previous_value": 140.00,
      "change_percent": -10.71
    }
  },
  "breakdown": {
    "by_channel": [...],
    "by_store": [...]
  }
}

10. Agent Implementation Notes
10.1 Data Pipeline Agent
Responsibilities:

Poll integrations on schedule
Process webhooks in real-time
Reconcile order data with ad platform data
Run attribution matching

State Machine:
IDLE → FETCHING → PROCESSING → RECONCILING → IDLE
         ↓            ↓             ↓
       ERROR        ERROR        ERROR
10.2 Attribution Agent
Matching Algorithm:

Extract click_id from Luca Pixel events
Match click_id to ad platform click data
Apply attribution window rules
Handle multi-touch (first-click, last-click, linear)
Store attribution record

Fallback Hierarchy:

Luca Pixel click_id match (highest confidence)
UTM parameter match
Referrer domain match
Time-decay model (lowest confidence)

10.3 Calculation Agent
Execution Order:

Aggregate raw order data for period
Aggregate raw ad spend data for period
Calculate derived metrics in dependency order:

Total Sales (depends on: orders)
Order Revenue (depends on: orders)
Blended Ad Spend (depends on: ad spend, custom expenses)
Net Profit (depends on: Order Revenue, costs, Blended Ad Spend)
ROAS (depends on: Order Revenue, Blended Ad Spend)
MER (depends on: Blended Ad Spend, Order Revenue)
Net Margin (depends on: Net Profit, Total Sales)
NCPA (depends on: Blended Ad Spend, new customer count)




11. Open Questions

Multi-currency handling - How to handle stores with multiple currencies? Convert at order time or report time?
Attribution window configurability - Should users be able to change attribution windows, or use a single default?
Channel grouping - How granular? Campaign level? Ad set level? Ad level?
Historical data import - How far back to import on initial setup?
Refund attribution - Should refunds be attributed back to the original channel, or treated as channel-agnostic?


12. Revision History
VersionDateAuthorChanges0.2.02025-01-18-Added integration architecture, attribution problem, Luca Pixel details0.1.02025-01-18-Initial draftArtifactsDownload allLuca insight specDocument · MD 