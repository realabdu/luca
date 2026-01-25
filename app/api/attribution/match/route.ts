import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { AttributionEngine, ATTRIBUTION_WINDOWS, AttributionWindow } from "@/lib/attribution/engine";

export const runtime = "edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = require("@/convex/_generated/api").api as any;

/**
 * POST /api/attribution/match
 * Run attribution matching for pending purchase events
 */
export async function POST(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Backend not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId;
    const window: AttributionWindow = body.window || "7d_click";
    const limit = body.limit || 100;

    const client = new ConvexHttpClient(convexUrl);
    const engine = new AttributionEngine(client, { defaultWindow: window });

    // Get pending purchase events
    const pendingEvents = await client.query(api.pixelEvents.getPendingAttributions, {
      storeId,
      limit,
    });

    console.log(`[Attribution] Processing ${pendingEvents.length} pending events`);

    const results = {
      processed: 0,
      matched: 0,
      unmatched: 0,
      errors: 0,
      matches: [] as Array<{
        orderId: string;
        platform: string;
        confidence: number;
        method: string;
      }>,
    };

    // Process each pending event
    for (const event of pendingEvents) {
      try {
        results.processed++;

        // Try to match using the attribution engine
        const match = await engine.matchPurchaseEvent({
          id: event._id,
          storeId: event.storeId,
          timestamp: event.timestamp,
          orderId: event.orderId,
          orderValue: event.orderValue,
          customerEmail: event.customerEmail,
          platform: event.platform,
          clickId: event.clickId,
          clickTimestamp: event.clickTimestamp,
          sessionId: event.sessionId,
          utmSource: event.utmSource,
          utmMedium: event.utmMedium,
          utmCampaign: event.utmCampaign,
          attributionMethod: event.attributionMethod,
        });

        if (match) {
          results.matched++;
          results.matches.push({
            orderId: match.orderId,
            platform: match.platform,
            confidence: match.confidence,
            method: match.attributionMethod,
          });

          // Update the pixel event with attribution status
          await client.mutation(api.pixelEvents.updateAttributionStatus, {
            eventId: event._id,
            status: "matched",
            matchedOrderId: match.orderId,
            matchConfidence: match.confidence,
          });

          // Mark the click as converted (if there was a click ID)
          if (match.clickId) {
            await client.mutation(api.pixelEvents.markClickConverted, {
              clickId: match.clickId,
              orderId: match.orderId,
              conversionTimestamp: match.conversionTimestamp,
              conversionValue: event.orderValue || 0,
            });
          }
        } else {
          results.unmatched++;

          // Mark as unmatched after attempting
          await client.mutation(api.pixelEvents.updateAttributionStatus, {
            eventId: event._id,
            status: "unmatched",
          });
        }
      } catch (error) {
        console.error(`[Attribution] Error processing event ${event._id}:`, error);
        results.errors++;
      }
    }

    console.log(`[Attribution] Complete - Matched: ${results.matched}, Unmatched: ${results.unmatched}`);

    return NextResponse.json({
      success: true,
      window,
      ...results,
    });
  } catch (error) {
    console.error("[Attribution] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Attribution matching failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attribution/match
 * Get attribution statistics
 */
export async function GET(request: NextRequest) {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Backend not configured" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get("store_id");

    if (!storeId) {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    // Calculate date range (last 30 days)
    const endDate = Date.now();
    const startDate = endDate - 30 * 24 * 60 * 60 * 1000;

    const client = new ConvexHttpClient(convexUrl);

    const stats = await client.query(api.pixelEvents.getAttributionStats, {
      storeId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      storeId,
      period: {
        start: new Date(startDate).toISOString(),
        end: new Date(endDate).toISOString(),
      },
      ...stats,
    });
  } catch (error) {
    console.error("[Attribution] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get stats" },
      { status: 500 }
    );
  }
}
