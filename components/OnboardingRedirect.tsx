"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useIsConvexConfigured } from "@/components/ConvexClientProvider";

// Import api with fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let api: any;
try {
  api = require("@/convex/_generated/api").api;
} catch {
  api = {};
}

interface OnboardingRedirectProps {
  children: React.ReactNode;
}

/**
 * Client component that checks onboarding status and redirects if needed.
 * This wraps the dashboard content and handles the redirect logic.
 */
export default function OnboardingRedirect({ children }: OnboardingRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const isConvexConfigured = useIsConvexConfigured();

  // Only query when authenticated
  const canQuery = isConvexConfigured && isLoaded && isSignedIn;

  // Check if onboarding is needed
  const hasOnboardingApi = api?.onboarding?.needsOnboarding;
  const needsOnboarding = useQuery(
    hasOnboardingApi ? api.onboarding.needsOnboarding : undefined,
    canQuery && hasOnboardingApi ? {} : "skip"
  );

  // Pages that should bypass onboarding check
  const bypassPaths = [
    "/onboarding",
    "/integrations",
    "/settings",
  ];

  const shouldBypass = bypassPaths.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`)
  );

  useEffect(() => {
    // Redirect to onboarding if needed and not already on a bypass path
    if (needsOnboarding === true && !shouldBypass) {
      router.push("/onboarding");
    }
  }, [needsOnboarding, shouldBypass, router]);

  // Show loading state while checking onboarding status
  // But only if we're not already on a bypass path
  if (!shouldBypass && needsOnboarding === undefined && canQuery) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If auth is still loading, just render children
  if (!isLoaded) {
    return <>{children}</>;
  }

  // If we need onboarding and we're on a protected page, show loading while redirecting
  if (needsOnboarding === true && !shouldBypass) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-text-muted text-sm">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
