import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // Multi-tenant SaaS Tables
  // ============================================

  // Organizations (tenants)
  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly unique identifier
    clerkOrgId: v.optional(v.string()), // Clerk organization ID
    settings: v.optional(
      v.object({
        timezone: v.optional(v.string()),
        currency: v.optional(v.string()),
        attributionWindow: v.optional(v.number()),
      })
    ),
    // Onboarding tracking
    onboardingStatus: v.optional(
      v.union(
        v.literal("pending"), // Just created, no integrations
        v.literal("store_connected"), // E-commerce connected
        v.literal("ads_connected"), // At least one ad platform connected
        v.literal("completed") // Full setup done
      )
    ),
    onboardingCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_clerk_org", ["clerkOrgId"])
    .index("by_onboarding_status", ["onboardingStatus"]),

  // Users
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Memberships (users <-> organizations)
  memberships: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_user_org", ["userId", "organizationId"]),

  // API Keys (for pixel tracking and webhooks)
  apiKeys: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    keyHash: v.string(), // SHA-256 hash
    keyPrefix: v.string(), // First 8 chars for display
    permissions: v.array(v.string()),
    lastUsedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_key_hash", ["keyHash"]),

  // OAuth State (for multi-tenant OAuth flows)
  oauthStates: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    platform: v.string(),
    state: v.string(),
    expiresAt: v.number(),
  }).index("by_state", ["state"]),

  // ============================================
  // Existing Tables (with organizationId)
  // ============================================

  campaigns: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    name: v.string(),
    platform: v.union(
      v.literal("Meta"),
      v.literal("Google"),
      v.literal("TikTok"),
      v.literal("Snapchat"),
      v.literal("X"),
      v.literal("Klaviyo")
    ),
    status: v.union(
      v.literal("Active"),
      v.literal("Paused"),
      v.literal("Learning"),
      v.literal("Inactive")
    ),
    spend: v.number(),
    revenue: v.number(),
    roas: v.number(),
    cpa: v.number(),
    externalId: v.optional(v.string()), // ID from the external platform
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_external_id", ["externalId"])
    .index("by_organization_platform", ["organizationId", "platform"]),

  attributionEvents: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    timestamp: v.number(),
    amount: v.number(),
    source: v.union(
      v.literal("Meta"),
      v.literal("Google"),
      v.literal("TikTok"),
      v.literal("Snapchat"),
      v.literal("X"),
      v.literal("Klaviyo"),
      v.literal("salla"), // E-commerce source
      v.literal("shopify") // Shopify e-commerce source
    ),
    campaign: v.optional(v.string()), // Optional for e-commerce events
    creativeUrl: v.optional(v.string()), // Optional for e-commerce events
    status: v.union(v.literal("Paid"), v.literal("Pending")),
    // New fields for e-commerce integration
    type: v.optional(
      v.union(
        v.literal("purchase"),
        v.literal("refund"),
        v.literal("add_to_cart"),
        v.literal("checkout"),
        v.literal("page_view")
      )
    ),
    eventId: v.optional(v.string()), // Unique event ID for deduplication
    orderId: v.optional(v.string()), // Order reference
    currency: v.optional(v.string()), // Currency code (SAR, USD, etc.)
    customerEmail: v.optional(v.string()),
    customerId: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional event data
  })
    .index("by_organization", ["organizationId"])
    .index("by_source", ["source"])
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"])
    .index("by_order_id", ["orderId"])
    .index("by_event_id", ["eventId"])
    .index("by_organization_timestamp", ["organizationId", "timestamp"]),

  performanceData: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    date: v.string(),
    revenue: v.number(),
    spend: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_date", ["date"])
    .index("by_organization_date", ["organizationId", "date"]),

  platformSpend: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    platform: v.string(),
    percentage: v.number(),
    color: v.string(),
  }).index("by_organization", ["organizationId"]),

  metrics: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    label: v.string(),
    value: v.string(),
    unit: v.optional(v.string()),
    trend: v.number(),
    trendLabel: v.string(),
    icon: v.string(),
    trendType: v.union(
      v.literal("up"),
      v.literal("down"),
      v.literal("neutral")
    ),
    color: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_order", ["order"]),

  // Platform integrations (OAuth credentials and connection status)
  integrations: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    platform: v.union(
      v.literal("salla"),
      v.literal("shopify"),
      v.literal("meta"),
      v.literal("google"),
      v.literal("tiktok"),
      v.literal("snapchat")
    ),
    accessToken: v.string(), // Encrypted
    refreshToken: v.optional(v.string()), // Encrypted
    expiresAt: v.optional(v.number()), // Token expiration timestamp
    accountId: v.string(), // Ad account ID or store ID
    accountName: v.string(), // Display name
    isConnected: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    metadata: v.optional(v.any()), // Platform-specific data (ad account details, etc.)
  })
    .index("by_organization", ["organizationId"])
    .index("by_platform", ["platform"])
    .index("by_connected", ["isConnected"])
    .index("by_organization_platform", ["organizationId", "platform"])
    .index("by_account_id", ["accountId"]),

  // Sync history and error tracking
  syncLogs: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    integrationId: v.id("integrations"),
    syncType: v.union(
      v.literal("campaigns"),
      v.literal("events"),
      v.literal("orders"),
      v.literal("metrics"),
      v.literal("full")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("success"),
      v.literal("failed")
    ),
    recordsProcessed: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_integration", ["integrationId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // Luca Pixel events for first-party tracking
  pixelEvents: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    storeId: v.string(),
    eventType: v.string(), // page_view, add_to_cart, begin_checkout, purchase
    timestamp: v.number(),

    // Session data
    sessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
    sessionPageViews: v.optional(v.number()),

    // Attribution data (from click tracking)
    platform: v.optional(v.string()), // meta, snapchat, tiktok, google
    clickId: v.optional(v.string()), // fbclid, sccid, ttclid, gclid
    clickTimestamp: v.optional(v.number()),
    landingPage: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    attributionMethod: v.optional(v.string()), // click_id, utm, referrer, unknown

    // Page data
    pageUrl: v.optional(v.string()),
    pagePath: v.optional(v.string()),
    pageReferrer: v.optional(v.string()),
    pageTitle: v.optional(v.string()),

    // Event-specific data (JSON)
    eventData: v.optional(v.any()),

    // For purchase events
    orderId: v.optional(v.string()),
    orderValue: v.optional(v.number()),
    customerEmail: v.optional(v.string()),
    isNewCustomer: v.optional(v.boolean()),

    // Metadata
    pixelVersion: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),

    // Attribution status (for linking to orders)
    attributionStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("matched"),
        v.literal("unmatched")
      )
    ),
    matchedOrderId: v.optional(v.string()), // ID of matched order from Salla/Zid
    matchConfidence: v.optional(v.number()), // 0-1 confidence score
  })
    .index("by_organization", ["organizationId"])
    .index("by_store", ["storeId"])
    .index("by_event_type", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_session", ["sessionId"])
    .index("by_click_id", ["clickId"])
    .index("by_order_id", ["orderId"])
    .index("by_attribution_status", ["attributionStatus"])
    .index("by_organization_timestamp", ["organizationId", "timestamp"]),

  // Cached daily metrics for dashboard (aggregated data)
  dailyMetrics: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    date: v.string(), // YYYY-MM-DD format
    storeId: v.optional(v.string()), // For multi-store support

    // Revenue data (from Salla/Zid)
    revenue: v.number(),
    ordersCount: v.number(),
    averageOrderValue: v.number(),
    newCustomersCount: v.optional(v.number()),

    // Ad spend data (aggregated from all platforms)
    totalSpend: v.number(),
    spendByPlatform: v.optional(v.any()), // { snapchat: 100, meta: 200, ... }

    // Calculated metrics
    netProfit: v.number(),
    roas: v.number(),
    mer: v.number(), // Marketing Efficiency Ratio
    netMargin: v.number(),
    ncpa: v.number(), // New Customer Acquisition Cost

    // Sync metadata
    lastSyncAt: v.number(),
    dataSource: v.optional(v.string()), // 'live' or 'cached'
  })
    .index("by_organization", ["organizationId"])
    .index("by_date", ["date"])
    .index("by_store_date", ["storeId", "date"])
    .index("by_organization_date", ["organizationId", "date"]),

  // Cached orders from Salla/Zid (ground truth)
  orders: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    externalId: v.string(), // Order ID from Salla/Zid
    storeId: v.string(),
    source: v.union(
      v.literal("salla"),
      v.literal("zid"),
      v.literal("shopify")
    ),

    // Order details
    orderDate: v.number(), // Timestamp
    totalAmount: v.number(),
    currency: v.string(),
    status: v.string(), // completed, cancelled, refunded, etc.

    // Customer info
    customerId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    isNewCustomer: v.optional(v.boolean()),

    // Attribution (linked from pixel events)
    attributedPlatform: v.optional(v.string()),
    attributedClickId: v.optional(v.string()),
    attributionConfidence: v.optional(v.number()),

    // Sync metadata
    syncedAt: v.number(),
    rawData: v.optional(v.any()), // Original order data from API
  })
    .index("by_organization", ["organizationId"])
    .index("by_external_id", ["externalId"])
    .index("by_store", ["storeId"])
    .index("by_date", ["orderDate"])
    .index("by_source", ["source"])
    .index("by_organization_date", ["organizationId", "orderDate"]),

  // Daily ad spend per platform (for detailed breakdown)
  adSpendDaily: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    date: v.string(), // YYYY-MM-DD
    platform: v.string(), // snapchat, meta, google, tiktok
    accountId: v.string(), // Ad account ID

    // Spend data
    spend: v.number(),
    currency: v.string(),

    // Performance metrics
    impressions: v.optional(v.number()),
    clicks: v.optional(v.number()),
    conversions: v.optional(v.number()),

    // Sync metadata
    syncedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_date", ["date"])
    .index("by_platform_date", ["platform", "date"])
    .index("by_account_date", ["accountId", "date"])
    .index("by_organization_date", ["organizationId", "date"]),

  // Click tracking data (for attribution window matching)
  clickTracking: defineTable({
    organizationId: v.optional(v.id("organizations")), // Optional for migration of legacy data
    storeId: v.string(),
    platform: v.string(), // meta, snapchat, tiktok, google
    clickId: v.string(), // The actual click ID from the platform
    timestamp: v.number(), // When the click was captured
    landingPage: v.string(),
    referrer: v.optional(v.string()),

    // UTM parameters
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),

    // Session info
    sessionId: v.optional(v.string()),

    // Attribution status
    converted: v.boolean(), // Has this click been attributed to a conversion?
    conversionOrderId: v.optional(v.string()),
    conversionTimestamp: v.optional(v.number()),
    conversionValue: v.optional(v.number()),

    // Metadata
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_store", ["storeId"])
    .index("by_platform", ["platform"])
    .index("by_click_id", ["clickId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_converted", ["converted"])
    .index("by_organization_timestamp", ["organizationId", "timestamp"]),
});
