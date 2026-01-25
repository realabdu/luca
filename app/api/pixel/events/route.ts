import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { validateApiKey } from "@/lib/apiKeyAuth";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

interface PixelEvent {
  store_id: string;
  event_type: string;
  timestamp: number;
  session: {
    id: string;
    started_at: number;
    page_views: number;
    last_activity: number;
  };
  click: {
    platform: string;
    click_id: string | null;
    timestamp: number;
    landing_page: string;
    referrer: string;
    utms?: Record<string, string>;
    attribution_method?: string;
  } | null;
  page: {
    url: string;
    path: string;
    referrer: string;
    title: string;
  };
  data: Record<string, unknown>;
  pixel_version: string;
}

/**
 * POST /api/pixel/events
 * Receives tracking events from Luca Pixel (multi-tenant via API key)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const auth = await validateApiKey(request, "pixel:write");

    if (!auth.valid || !auth.organizationId) {
      return NextResponse.json(
        { error: auth.error || "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse the event data
    const event: PixelEvent = await request.json();

    // Validate required fields
    if (!event.store_id || !event.event_type) {
      return NextResponse.json(
        { error: "Missing required fields: store_id, event_type" },
        { status: 400 }
      );
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Backend not configured" },
        { status: 500 }
      );
    }

    const client = new ConvexHttpClient(convexUrl);

    // Create the pixel event record WITH organizationId
    const eventRecord = {
      organizationId: auth.organizationId,
      storeId: event.store_id,
      eventType: event.event_type,
      timestamp: event.timestamp || Date.now(),
      sessionId: event.session?.id,
      sessionStartedAt: event.session?.started_at,
      sessionPageViews: event.session?.page_views || 1,

      // Attribution data
      platform: event.click?.platform || undefined,
      clickId: event.click?.click_id || undefined,
      clickTimestamp: event.click?.timestamp || undefined,
      landingPage: event.click?.landing_page || undefined,
      utmSource: event.click?.utms?.utm_source || undefined,
      utmMedium: event.click?.utms?.utm_medium || undefined,
      utmCampaign: event.click?.utms?.utm_campaign || undefined,
      attributionMethod:
        event.click?.attribution_method ||
        (event.click?.click_id ? "click_id" : "unknown"),

      // Page data
      pageUrl: event.page?.url,
      pagePath: event.page?.path,
      pageReferrer: event.page?.referrer,
      pageTitle: event.page?.title,

      // Event-specific data
      eventData: event.data || {},

      // For purchase events, extract key fields
      orderId: event.data?.order_id as string | undefined,
      orderValue: event.data?.value as number | undefined,
      customerEmail: event.data?.customer_email as string | undefined,
      isNewCustomer: event.data?.is_new_customer as boolean | undefined,

      // Metadata
      pixelVersion: event.pixel_version,
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
    };

    // Save to database
    await client.mutation(api.pixelEvents.create, eventRecord);

    // If this is a purchase event with a click_id, trigger attribution matching
    if (
      event.event_type === "purchase" &&
      event.click?.click_id &&
      event.data?.order_id
    ) {
      console.log(
        `[Luca Pixel] Purchase event received for order ${event.data.order_id} with click_id ${event.click.click_id}`
      );
    }

    // Return success (204 No Content for pixel compatibility)
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[Luca Pixel] Error processing event:", error);

    // Still return success to avoid retries in pixel context
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
