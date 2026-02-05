"use client";

import dynamic from "next/dynamic";

export const runtime = 'edge';

// Dynamically import the OnboardingWizard to avoid SSR issues with Convex
const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/OnboardingWizard"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="animate-spin size-10 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-text-muted text-sm">Loading setup...</p>
        </div>
      </div>
    ),
  }
);

export default function OnboardingPage() {
  return (
    <div className="min-h-full flex items-center justify-center py-8 bg-gradient-to-b from-background-light to-white">
      <OnboardingWizard />
    </div>
  );
}
