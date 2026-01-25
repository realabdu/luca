import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const { sessionId } = await auth();

  return NextResponse.json({
    message: "To sign out, go to: http://localhost:3000/sign-in and click the user menu to sign out",
    currentSession: sessionId || "none",
    hint: "Or clear site data in DevTools > Application > Clear site data"
  });
}
