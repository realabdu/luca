import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.lucaserv.com";

/**
 * GET /api/dashboard
 * Proxies dashboard requests to Django backend
 */
export async function GET(request: NextRequest) {
  try {
    // Get Clerk auth token
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    // Forward query params to Django
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const djangoUrl = `${API_BASE_URL}/api/v1/dashboard/${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(djangoUrl, {
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
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
