/**
 * Luca Attribution Engine
 *
 * Matches ad platform clicks to e-commerce orders for accurate attribution.
 * Supports multiple attribution windows and models.
 */

import { ConvexHttpClient } from "convex/browser";

// Attribution window configuration (in milliseconds)
export const ATTRIBUTION_WINDOWS = {
  "1d_click": 1 * 24 * 60 * 60 * 1000, // 1 day
  "7d_click": 7 * 24 * 60 * 60 * 1000, // 7 days (default)
  "28d_click": 28 * 24 * 60 * 60 * 1000, // 28 days
  "1d_view": 1 * 24 * 60 * 60 * 1000, // 1 day view-through
  "7d_view": 7 * 24 * 60 * 60 * 1000, // 7 day view-through
} as const;

export type AttributionWindow = keyof typeof ATTRIBUTION_WINDOWS;

export type AttributionModel = "last_click" | "first_click" | "linear" | "time_decay";

export interface AttributionMatch {
  orderId: string;
  platform: string;
  clickId: string | null;
  clickTimestamp: number;
  conversionTimestamp: number;
  attributionWindow: AttributionWindow;
  confidence: number; // 0-1
  attributionMethod: "click_id" | "utm" | "referrer" | "time_decay";
}

export interface Order {
  id: string;
  customerId?: string;
  customerEmail?: string;
  createdAt: number; // timestamp
  amount: number;
  currency: string;
  source: "salla" | "zid" | "shopify";
}

export interface Click {
  id: string;
  platform: string;
  clickId: string;
  timestamp: number;
  sessionId?: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  converted: boolean;
}

export interface PixelPurchaseEvent {
  id: string;
  storeId: string;
  timestamp: number;
  orderId?: string;
  orderValue?: number;
  customerEmail?: string;
  platform?: string;
  clickId?: string;
  clickTimestamp?: number;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  attributionMethod?: string;
}

/**
 * Attribution Engine class
 */
export class AttributionEngine {
  private defaultWindow: AttributionWindow = "7d_click";
  private attributionModel: AttributionModel = "last_click";

  constructor(
    private client: ConvexHttpClient,
    options?: {
      defaultWindow?: AttributionWindow;
      attributionModel?: AttributionModel;
    }
  ) {
    if (options?.defaultWindow) {
      this.defaultWindow = options.defaultWindow;
    }
    if (options?.attributionModel) {
      this.attributionModel = options.attributionModel;
    }
  }

  /**
   * Match a purchase event from the pixel to click data
   * This is called when a purchase event is received from the pixel
   */
  async matchPurchaseEvent(event: PixelPurchaseEvent): Promise<AttributionMatch | null> {
    // Priority 1: Direct click ID match (highest confidence)
    if (event.clickId && event.platform) {
      return {
        orderId: event.orderId || "",
        platform: event.platform,
        clickId: event.clickId,
        clickTimestamp: event.clickTimestamp || event.timestamp,
        conversionTimestamp: event.timestamp,
        attributionWindow: this.defaultWindow,
        confidence: 0.95,
        attributionMethod: "click_id",
      };
    }

    // Priority 2: UTM parameter match
    if (event.utmSource || event.utmCampaign) {
      const platform = this.detectPlatformFromUtm(event.utmSource || "");
      return {
        orderId: event.orderId || "",
        platform: platform || event.utmSource || "unknown",
        clickId: null,
        clickTimestamp: event.timestamp, // Use event time as we don't have actual click time
        conversionTimestamp: event.timestamp,
        attributionWindow: this.defaultWindow,
        confidence: 0.75,
        attributionMethod: "utm",
      };
    }

    // Priority 3: Session-based matching (match by session ID to previous clicks)
    // This would require looking up clicks by session ID
    // For now, return null and let the caller handle unattributed conversions

    return null;
  }

  /**
   * Match an order from Salla/Zid webhook to pixel click data
   * This is called when an order webhook is received
   */
  async matchOrderToClick(
    order: Order,
    recentClicks: Click[],
    pixelEvents: PixelPurchaseEvent[]
  ): Promise<AttributionMatch | null> {
    const windowMs = ATTRIBUTION_WINDOWS[this.defaultWindow];
    const windowStart = order.createdAt - windowMs;

    // Strategy 1: Match by order ID in pixel events (direct pixel tracking)
    const matchingPixelEvent = pixelEvents.find(
      (e) => e.orderId === order.id && e.clickId
    );

    if (matchingPixelEvent && matchingPixelEvent.clickId) {
      return {
        orderId: order.id,
        platform: matchingPixelEvent.platform || "unknown",
        clickId: matchingPixelEvent.clickId,
        clickTimestamp: matchingPixelEvent.clickTimestamp || matchingPixelEvent.timestamp,
        conversionTimestamp: order.createdAt,
        attributionWindow: this.defaultWindow,
        confidence: 0.95,
        attributionMethod: "click_id",
      };
    }

    // Strategy 2: Match by customer email to session with clicks
    if (order.customerEmail) {
      const matchingEvent = pixelEvents.find(
        (e) =>
          e.customerEmail === order.customerEmail &&
          e.timestamp >= windowStart &&
          e.timestamp <= order.createdAt
      );

      if (matchingEvent) {
        return {
          orderId: order.id,
          platform: matchingEvent.platform || "unknown",
          clickId: matchingEvent.clickId || null,
          clickTimestamp: matchingEvent.clickTimestamp || matchingEvent.timestamp,
          conversionTimestamp: order.createdAt,
          attributionWindow: this.defaultWindow,
          confidence: matchingEvent.clickId ? 0.9 : 0.7,
          attributionMethod: matchingEvent.clickId ? "click_id" : "utm",
        };
      }
    }

    // Strategy 3: Time-based matching (last click within window)
    if (this.attributionModel === "last_click") {
      const eligibleClicks = recentClicks
        .filter((c) => c.timestamp >= windowStart && c.timestamp <= order.createdAt && !c.converted)
        .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

      if (eligibleClicks.length > 0) {
        const lastClick = eligibleClicks[0];
        const timeSinceClick = order.createdAt - lastClick.timestamp;
        const confidence = this.calculateTimeDecayConfidence(timeSinceClick, windowMs);

        return {
          orderId: order.id,
          platform: lastClick.platform,
          clickId: lastClick.clickId,
          clickTimestamp: lastClick.timestamp,
          conversionTimestamp: order.createdAt,
          attributionWindow: this.defaultWindow,
          confidence: Math.min(0.5, confidence), // Cap at 0.5 for time-based
          attributionMethod: "time_decay",
        };
      }
    }

    // Strategy 4: First click attribution
    if (this.attributionModel === "first_click") {
      const eligibleClicks = recentClicks
        .filter((c) => c.timestamp >= windowStart && c.timestamp <= order.createdAt && !c.converted)
        .sort((a, b) => a.timestamp - b.timestamp); // Earliest first

      if (eligibleClicks.length > 0) {
        const firstClick = eligibleClicks[0];

        return {
          orderId: order.id,
          platform: firstClick.platform,
          clickId: firstClick.clickId,
          clickTimestamp: firstClick.timestamp,
          conversionTimestamp: order.createdAt,
          attributionWindow: this.defaultWindow,
          confidence: 0.4,
          attributionMethod: "time_decay",
        };
      }
    }

    // No attribution found
    return null;
  }

  /**
   * Calculate confidence score based on time decay
   */
  private calculateTimeDecayConfidence(timeSinceClick: number, windowMs: number): number {
    // Linear decay: confidence decreases as time increases
    // Closer clicks get higher confidence
    const ratio = 1 - timeSinceClick / windowMs;
    return Math.max(0.1, Math.min(1, ratio * 0.5)); // Scale to 0.1-0.5 range
  }

  /**
   * Detect platform from UTM source
   */
  private detectPlatformFromUtm(utmSource: string): string | null {
    const source = utmSource.toLowerCase();

    if (source.includes("facebook") || source.includes("fb") || source.includes("instagram") || source.includes("ig")) {
      return "meta";
    }
    if (source.includes("snapchat") || source.includes("snap")) {
      return "snapchat";
    }
    if (source.includes("tiktok") || source.includes("tt")) {
      return "tiktok";
    }
    if (source.includes("google") || source.includes("gads") || source.includes("adwords")) {
      return "google";
    }

    return null;
  }

  /**
   * Get attribution window duration in milliseconds
   */
  getWindowDuration(window: AttributionWindow): number {
    return ATTRIBUTION_WINDOWS[window];
  }

  /**
   * Set the default attribution window
   */
  setDefaultWindow(window: AttributionWindow): void {
    this.defaultWindow = window;
  }

  /**
   * Set the attribution model
   */
  setAttributionModel(model: AttributionModel): void {
    this.attributionModel = model;
  }
}

/**
 * Create an attribution engine instance
 */
export function createAttributionEngine(
  convexUrl: string,
  options?: {
    defaultWindow?: AttributionWindow;
    attributionModel?: AttributionModel;
  }
): AttributionEngine {
  const client = new ConvexHttpClient(convexUrl);
  return new AttributionEngine(client, options);
}

/**
 * Calculate attribution confidence based on match quality
 */
export function calculateConfidence(match: {
  hasClickId: boolean;
  hasUtm: boolean;
  timeSinceClick: number;
  attributionWindowMs: number;
}): number {
  let confidence = 0;

  // Direct click ID match (highest confidence)
  if (match.hasClickId) {
    confidence = 0.95;
  }
  // UTM parameter match
  else if (match.hasUtm) {
    confidence = 0.75;
  }
  // Time-based match
  else {
    // Time decay: closer clicks get higher confidence
    const ratio = 1 - match.timeSinceClick / match.attributionWindowMs;
    confidence = Math.max(0.1, Math.min(0.5, ratio * 0.5));
  }

  return Math.round(confidence * 100) / 100;
}
