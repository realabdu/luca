import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

/**
 * POST /api/campaigns/sync
 * Syncs campaigns from connected ad platforms via Django
 */
export async function POST(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/campaigns/sync/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Campaign sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync campaigns" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/sync
 * Returns current sync status
 */
export async function GET(request: NextRequest) {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/campaigns/sync/status/`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Campaign status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get campaign status" },
      { status: 500 }
    );
  }
}
