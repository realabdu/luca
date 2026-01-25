import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/integrations/shopify";
import { ConvexHttpClient } from "convex/browser";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

// Type for Shopify order data in webhooks
interface ShopifyOrderData {
  id?: number;
  name?: string;
  order_number?: number;
  email?: string;
  total_price?: string;
  subtotal_price?: string;
  currency?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  created_at?: string;
  updated_at?: string;
  landing_site?: string;
  referring_site?: string;
  source_name?: string;
  customer?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  line_items?: Array<{
    id?: number;
    product_id?: number;
    name?: string;
    quantity?: number;
    price?: string;
  }>;
}

// Type for Shopify refund data in webhooks
interface ShopifyRefundData {
  id?: number;
  order_id?: number;
  created_at?: string;
  transactions?: Array<{
    amount?: string;
    currency?: string;
  }>;
}

/**
 * POST /api/webhooks/shopify
 * Handles incoming webhooks from Shopify (multi-tenant)
 *
 * Events handled:
 * - orders/create: New order placed
 * - orders/updated: Order updated
 * - orders/paid: Order marked as paid
 * - orders/cancelled: Order cancelled
 * - refunds/create: Refund created
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Shopify sends signature in X-Shopify-Hmac-SHA256 header (base64 encoded)
    const signature = request.headers.get("x-shopify-hmac-sha256");

    // Shop domain comes from X-Shopify-Shop-Domain header
    const shopDomain = request.headers.get("x-shopify-shop-domain");

    // Topic (event type) comes from X-Shopify-Topic header
    const topic = request.headers.get("x-shopify-topic");

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = await verifyShopifyWebhook(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Shopify webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);

    console.log(`Received Shopify webhook: ${topic}`, {
      orderId: payload?.id,
      shopDomain,
    });

    // Store event in Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn("Convex URL not configured, webhook data not stored");
      return NextResponse.json({ received: true });
    }

    const client = new ConvexHttpClient(convexUrl);

    // Shop domain is required for routing to organization
    if (!shopDomain) {
      console.error("Shopify webhook missing shop domain header");
      return NextResponse.json(
        { error: "Missing shop domain" },
        { status: 400 }
      );
    }

    // Find integration by account ID (shop domain) to get organizationId
    const integration = await client.query(api.integrations.getByAccountId, {
      accountId: shopDomain,
    });

    if (!integration) {
      console.error(`No integration found for Shopify shop: ${shopDomain}`);
      // Still return success to avoid webhook retries
      return NextResponse.json({
        received: true,
        warning: "Organization not found for shop",
      });
    }

    const organizationId = integration.organizationId;

    // Handle different event types
    switch (topic) {
      case "orders/create":
        await handleOrderCreated(client, payload as ShopifyOrderData, organizationId, shopDomain);
        break;

      case "orders/updated":
        await handleOrderUpdated(client, payload as ShopifyOrderData, organizationId);
        break;

      case "orders/paid":
        await handleOrderPaid(client, payload as ShopifyOrderData, organizationId);
        break;

      case "orders/cancelled":
        await handleOrderCancelled(client, payload as ShopifyOrderData, organizationId);
        break;

      case "refunds/create":
        await handleRefundCreated(client, payload as ShopifyRefundData, organizationId, shopDomain);
        break;

      default:
        console.log(`Unhandled Shopify webhook event: ${topic}`);
    }

    return NextResponse.json({ received: true, topic });
  } catch (error) {
    console.error("Error processing Shopify webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleOrderCreated(
  client: ConvexHttpClient,
  orderData: ShopifyOrderData,
  organizationId: string,
  shopDomain: string
) {
  if (!orderData) return;

  // Extract UTM parameters from landing_site URL
  const utmParams = extractUtmParams(orderData.landing_site);

  // Create attribution event for the order
  await client.mutation(api.events.createAttributionEvent, {
    organizationId,
    type: "purchase",
    source: "shopify",
    eventId: `shopify_order_${orderData.id}`,
    orderId: orderData.name || orderData.id?.toString(),
    orderAmount: parseFloat(orderData.total_price || "0"),
    currency: orderData.currency || "USD",
    customerEmail: orderData.customer?.email || orderData.email,
    customerId: orderData.customer?.id?.toString(),
    timestamp: orderData.created_at
      ? new Date(orderData.created_at).getTime()
      : Date.now(),
    metadata: {
      financial_status: orderData.financial_status,
      fulfillment_status: orderData.fulfillment_status,
      source_name: orderData.source_name,
      items_count: orderData.line_items?.length || 0,
      shop_domain: shopDomain,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
    },
  });

  console.log(`Created attribution event for Shopify order: ${orderData.id}`);
}

async function handleOrderUpdated(
  client: ConvexHttpClient,
  orderData: ShopifyOrderData,
  organizationId: string
) {
  if (!orderData) return;

  const orderId = orderData.name || orderData.id?.toString();
  if (!orderId) return;

  // Update the attribution event
  await client.mutation(api.events.updateAttributionEventByOrderId, {
    organizationId,
    orderId,
    source: "shopify",
    updates: {
      metadata: {
        financial_status: orderData.financial_status,
        fulfillment_status: orderData.fulfillment_status,
        updated_at: Date.now(),
      },
    },
  });

  console.log(`Updated attribution event for Shopify order: ${orderData.id}`);
}

async function handleOrderPaid(
  client: ConvexHttpClient,
  orderData: ShopifyOrderData,
  organizationId: string
) {
  if (!orderData) return;

  const orderId = orderData.name || orderData.id?.toString();
  if (!orderId) return;

  // Update the attribution event status to Paid
  await client.mutation(api.events.updateAttributionEventByOrderId, {
    organizationId,
    orderId,
    source: "shopify",
    updates: {
      status: "Paid",
      metadata: {
        financial_status: "paid",
        paid_at: Date.now(),
      },
    },
  });

  console.log(`Marked Shopify order as paid: ${orderData.id}`);
}

async function handleOrderCancelled(
  client: ConvexHttpClient,
  orderData: ShopifyOrderData,
  organizationId: string
) {
  if (!orderData) return;

  const orderId = orderData.name || orderData.id?.toString();
  if (!orderId) return;

  // Update the attribution event to cancelled status
  await client.mutation(api.events.updateAttributionEventByOrderId, {
    organizationId,
    orderId,
    source: "shopify",
    updates: {
      metadata: {
        financial_status: "cancelled",
        cancelled_at: Date.now(),
      },
    },
  });

  console.log(`Marked Shopify order as cancelled: ${orderData.id}`);
}

async function handleRefundCreated(
  client: ConvexHttpClient,
  refundData: ShopifyRefundData,
  organizationId: string,
  shopDomain: string
) {
  if (!refundData) return;

  // Calculate total refund amount from transactions
  const refundAmount = (refundData.transactions || []).reduce(
    (sum, tx) => sum + parseFloat(tx.amount || "0"),
    0
  );

  const currency = refundData.transactions?.[0]?.currency || "USD";

  // Create a refund event
  await client.mutation(api.events.createAttributionEvent, {
    organizationId,
    type: "refund",
    source: "shopify",
    eventId: `shopify_refund_${refundData.id}_${Date.now()}`,
    orderId: refundData.order_id?.toString(),
    orderAmount: -refundAmount, // Negative for refund
    currency,
    timestamp: refundData.created_at
      ? new Date(refundData.created_at).getTime()
      : Date.now(),
    metadata: {
      refund_id: refundData.id,
      original_order_id: refundData.order_id,
      shop_domain: shopDomain,
    },
  });

  console.log(`Created refund event for Shopify order: ${refundData.order_id}`);
}

function extractUtmParams(landingSite?: string): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  if (!landingSite) return {};

  try {
    const url = new URL(landingSite);
    return {
      utm_source: url.searchParams.get("utm_source") || undefined,
      utm_medium: url.searchParams.get("utm_medium") || undefined,
      utm_campaign: url.searchParams.get("utm_campaign") || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * GET /api/webhooks/shopify
 * Webhook verification endpoint (Shopify may require this for app validation)
 */
export async function GET() {
  return NextResponse.json({ status: "Shopify webhook endpoint ready" });
}
