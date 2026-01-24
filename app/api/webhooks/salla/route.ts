import { NextRequest, NextResponse } from "next/server";
import {
  verifySallaWebhook,
  parseSallaWebhook,
} from "@/lib/integrations/salla";
import { ConvexHttpClient } from "convex/browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

// Type for Salla order data in webhooks
interface SallaOrderData {
  id?: number;
  reference_id?: string;
  status?: { name?: string; slug?: string };
  payment_method?: string;
  amounts?: {
    total?: { amount?: number; currency?: string };
  };
  customer?: {
    id?: number;
    email?: string;
  };
  date?: { date?: string };
  items?: Array<unknown>;
}

/**
 * POST /api/webhooks/salla
 * Handles incoming webhooks from Salla (multi-tenant)
 *
 * Events handled:
 * - order.created: New order placed
 * - order.updated: Order status changed
 * - order.refunded: Order refunded
 * - order.cancelled: Order cancelled
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-salla-signature");

    // Verify webhook signature
    const webhookSecret = process.env.SALLA_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifySallaWebhook(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Salla webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = parseSallaWebhook(payload);

    console.log(`Received Salla webhook: ${event.event}`, {
      orderId: (event.data as SallaOrderData)?.id,
      merchantId: event.merchantId,
    });

    // Store event in Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn("Convex URL not configured, webhook data not stored");
      return NextResponse.json({ received: true });
    }

    const client = new ConvexHttpClient(convexUrl);

    // Lookup organization by merchant ID (store ID in Salla)
    const merchantId = event.merchantId?.toString();
    if (!merchantId) {
      console.error("Salla webhook missing merchant ID");
      return NextResponse.json(
        { error: "Missing merchant ID" },
        { status: 400 }
      );
    }

    // Find integration by account ID to get organizationId
    const integration = await client.query(api.integrations.getByAccountId, {
      accountId: merchantId,
    });

    if (!integration) {
      console.error(`No integration found for Salla merchant: ${merchantId}`);
      // Still return success to avoid webhook retries
      return NextResponse.json({
        received: true,
        warning: "Organization not found for merchant",
      });
    }

    const organizationId = integration.organizationId;

    // Handle different event types
    switch (event.event) {
      case "order.created":
        await handleOrderCreated(client, event, organizationId);
        break;

      case "order.updated":
        await handleOrderUpdated(client, event, organizationId);
        break;

      case "order.refunded":
        await handleOrderRefunded(client, event, organizationId);
        break;

      case "order.cancelled":
        await handleOrderCancelled(client, event, organizationId);
        break;

      default:
        console.log(`Unhandled Salla webhook event: ${event.event}`);
    }

    return NextResponse.json({ received: true, event: event.event });
  } catch (error) {
    console.error("Error processing Salla webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type ParsedEvent = ReturnType<typeof parseSallaWebhook>;

async function handleOrderCreated(
  client: ConvexHttpClient,
  event: ParsedEvent,
  organizationId: string
) {
  const orderData = event.data as SallaOrderData;
  if (!orderData) return;

  // Create attribution event for the order
  await client.mutation(api.events.createAttributionEvent, {
    organizationId,
    type: "purchase",
    source: "salla",
    eventId: `salla_order_${orderData.id}`,
    orderId: orderData.reference_id || orderData.id?.toString(),
    orderAmount: orderData.amounts?.total?.amount || 0,
    currency: orderData.amounts?.total?.currency || "SAR",
    customerEmail: orderData.customer?.email,
    customerId: orderData.customer?.id?.toString(),
    timestamp: orderData.date?.date
      ? new Date(orderData.date.date).getTime()
      : Date.now(),
    metadata: {
      status: orderData.status?.name,
      payment_method: orderData.payment_method,
      items_count: orderData.items?.length || 0,
      merchant_id: event.merchantId,
    },
  });

  console.log(`Created attribution event for Salla order: ${orderData.id}`);
}

async function handleOrderUpdated(
  client: ConvexHttpClient,
  event: ParsedEvent,
  organizationId: string
) {
  const orderData = event.data as SallaOrderData;
  if (!orderData) return;

  const orderId = orderData.reference_id || orderData.id?.toString();
  if (!orderId) return;

  // Update the attribution event status
  await client.mutation(api.events.updateAttributionEventByOrderId, {
    organizationId,
    orderId,
    source: "salla",
    updates: {
      metadata: {
        status: orderData.status?.name,
        updated_at: Date.now(),
      },
    },
  });

  console.log(`Updated attribution event for Salla order: ${orderData.id}`);
}

async function handleOrderRefunded(
  client: ConvexHttpClient,
  event: ParsedEvent,
  organizationId: string
) {
  const orderData = event.data as SallaOrderData;
  if (!orderData) return;

  // Create a refund event
  await client.mutation(api.events.createAttributionEvent, {
    organizationId,
    type: "refund",
    source: "salla",
    eventId: `salla_refund_${orderData.id}_${Date.now()}`,
    orderId: orderData.reference_id || orderData.id?.toString(),
    orderAmount: -(orderData.amounts?.total?.amount || 0), // Negative for refund
    currency: orderData.amounts?.total?.currency || "SAR",
    customerEmail: orderData.customer?.email,
    customerId: orderData.customer?.id?.toString(),
    timestamp: Date.now(),
    metadata: {
      original_order_id: orderData.id,
      refund_reason: "order_refunded",
      merchant_id: event.merchantId,
    },
  });

  console.log(`Created refund event for Salla order: ${orderData.id}`);
}

async function handleOrderCancelled(
  client: ConvexHttpClient,
  event: ParsedEvent,
  organizationId: string
) {
  const orderData = event.data as SallaOrderData;
  if (!orderData) return;

  const orderId = orderData.reference_id || orderData.id?.toString();
  if (!orderId) return;

  // Update the attribution event to cancelled status
  await client.mutation(api.events.updateAttributionEventByOrderId, {
    organizationId,
    orderId,
    source: "salla",
    updates: {
      metadata: {
        status: "cancelled",
        cancelled_at: Date.now(),
      },
    },
  });

  console.log(`Marked Salla order as cancelled: ${orderData.id}`);
}

/**
 * GET /api/webhooks/salla
 * Webhook verification endpoint (some platforms require this)
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");

  // Return challenge for webhook verification
  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ status: "Salla webhook endpoint ready" });
}
