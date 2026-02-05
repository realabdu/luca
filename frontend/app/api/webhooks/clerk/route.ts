import { NextRequest, NextResponse } from "next/server";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

/**
 * POST /api/webhooks/clerk
 * Proxies Clerk webhooks to Django backend
 */
export async function POST(req: NextRequest) {
  try {
    // Get all headers for signature verification
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get the body
    const body = await req.text();

    // Forward to Django
    const response = await fetch(`${API_BASE_URL}/api/v1/webhooks/clerk/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": headers["svix-id"] || "",
        "svix-timestamp": headers["svix-timestamp"] || "",
        "svix-signature": headers["svix-signature"] || "",
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Django Clerk webhook error:", error);
      return new NextResponse(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    return new NextResponse(
      `Error processing webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "Clerk webhook endpoint active" });
}
