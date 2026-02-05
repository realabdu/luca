import { NextRequest, NextResponse } from "next/server";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

/**
 * POST /api/webhooks/shopify
 * Proxies Shopify webhooks to Django backend
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body and headers
    const rawBody = await request.text();
    const signature = request.headers.get("x-shopify-hmac-sha256");
    const shopDomain = request.headers.get("x-shopify-shop-domain");
    const topic = request.headers.get("x-shopify-topic");

    // Forward to Django
    const response = await fetch(`${API_BASE_URL}/api/v1/webhooks/shopify/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-hmac-sha256": signature || "",
        "x-shopify-shop-domain": shopDomain || "",
        "x-shopify-topic": topic || "",
      },
      body: rawBody,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Django Shopify webhook error:", error);
      return new NextResponse(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing Shopify webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/shopify
 * Webhook verification endpoint
 */
export async function GET() {
  return NextResponse.json({ status: "Shopify webhook endpoint ready" });
}
