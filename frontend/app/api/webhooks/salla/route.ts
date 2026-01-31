import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

/**
 * POST /api/webhooks/salla
 * Proxies Salla webhooks to Django backend
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get("x-salla-signature");

    // Forward to Django
    const response = await fetch(`${API_BASE_URL}/api/v1/webhooks/salla/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-salla-signature": signature || "",
      },
      body: rawBody,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Django Salla webhook error:", error);
      return new NextResponse(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing Salla webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/salla
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({ status: "Salla webhook endpoint ready" });
}
