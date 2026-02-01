"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOrganization, useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import OnboardingProgress from "./OnboardingProgress";
import StoreConnectStep from "./StoreConnectStep";
import AdsConnectStep from "./AdsConnectStep";
import OnboardingComplete from "./OnboardingComplete";
import { IntegrationPlatform } from "@/types/integrations";
import { useOnboardingStatusQuery, useSkipAds, useCompleteOnboarding } from "@/features/onboarding/hooks/use-onboarding-queries";
import { useIntegrationsQuery } from "@/features/integrations/hooks/use-integrations-queries";
import { useConnectIntegration } from "@/features/integrations/hooks/use-integrations-mutations";
import { queryKeys } from "@/lib/query-client/query-keys";

const STEPS = [
  { label: "Connect Store", description: "Primary data source" },
  { label: "Connect Ads", description: "Track ad spend" },
];

type AdPlatform = "snapchat" | "meta" | "google" | "tiktok";

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { isLoaded, isSignedIn } = useAuth();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  // Only query when authenticated AND an organization is selected
  const canQuery = isLoaded && isSignedIn && isOrgLoaded && !!organization;

  // Use new React Query hooks
  const { data: onboardingStatus, isLoading: isLoadingStatus } = useOnboardingStatusQuery();
  const { data: integrations, isLoading: isLoadingIntegrations } = useIntegrationsQuery();
  const { mutate: skipAds, isPending: isSkippingAds } = useSkipAds();
  const { mutate: completeOnboarding, isPending: isCompleting } = useCompleteOnboarding();
  const { mutate: connectIntegration } = useConnectIntegration();

  // Handle OAuth redirect messages
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      setNotification({
        type: "success",
        message: `Successfully connected to ${connected}!`,
      });
      window.history.replaceState({}, "", "/onboarding");
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    } else if (error) {
      setNotification({
        type: "error",
        message: decodeURIComponent(error),
      });
      window.history.replaceState({}, "", "/onboarding");
    }
  }, [searchParams, queryClient]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (onboardingStatus?.status === "completed" && !showComplete) {
      router.push("/");
    }
  }, [onboardingStatus?.status, router, showComplete]);

  const handleConnect = (platform: IntegrationPlatform) => {
    connectIntegration({ platform });
  };

  const handleSkipAds = async () => {
    skipAds(undefined, {
      onSuccess: () => {
        setShowComplete(true);
      },
      onError: () => {
        setNotification({
          type: "error",
          message: "Failed to skip ads step. Please try again.",
        });
      },
    });
  };

  const handleComplete = async () => {
    completeOnboarding(undefined, {
      onSuccess: () => {
        setShowComplete(true);
      },
      onError: () => {
        setNotification({
          type: "error",
          message: "Failed to complete onboarding. Please try again.",
        });
      },
    });
  };

  // Derive current state from integrations
  const sallaIntegration = integrations?.find(
    (i) => i.platform === "salla" && i.isConnected
  );
  const connectedAds = integrations?.filter(
    (i) =>
      ["snapchat", "meta", "google", "tiktok"].includes(i.platform) &&
      i.isConnected
  ) || [];

  const storeConnected = !!sallaIntegration;
  const currentStep = showComplete ? 3 : storeConnected ? 2 : 1;

  // Loading state
  if (!isLoaded || !isOrgLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show message if no organization is selected
  if (isSignedIn && !organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <h2 className="text-2xl font-bold text-text-main mb-2">No Organization Selected</h2>
        <p className="text-text-muted mb-4">Please select or create an organization to continue with onboarding.</p>
      </div>
    );
  }

  // Loading data state
  if (isLoadingStatus || isLoadingIntegrations) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-12">
      {/* Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 p-4 shadow-xl border backdrop-blur-md ${
            notification.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-red-50/90 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === "success" ? "check" : "priority_high"}
            </span>
            <span className="text-sm font-semibold">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 p-1" aria-label="Dismiss notification">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-text-main text-balance">
          Welcome to Luca{organization?.name ? `, ${organization.name}` : ""}
        </h1>
        <p className="text-text-muted">
          Let's get your analytics set up in just a few steps
        </p>
      </div>

      {/* Progress Indicator - Only show during steps, not on complete */}
      {!showComplete && (
        <OnboardingProgress
          currentStep={currentStep}
          totalSteps={2}
          steps={STEPS}
        />
      )}

      {/* Step Content */}
      <div className="min-h-[400px]">
        {showComplete ? (
          <OnboardingComplete
            storeConnected={storeConnected}
            storeName={sallaIntegration?.accountName}
            connectedAds={connectedAds.map((a) => ({
              platform: a.platform,
              accountName: a.accountName,
            }))}
            skippedAds={connectedAds.length === 0}
          />
        ) : currentStep === 1 ? (
          <StoreConnectStep
            sallaConnected={storeConnected}
            sallaAccountName={sallaIntegration?.accountName}
            onConnect={handleConnect}
          />
        ) : (
          <AdsConnectStep
            connectedPlatforms={connectedAds.map((a) => ({
              platform: a.platform as AdPlatform,
              accountName: a.accountName,
            }))}
            onConnect={handleConnect}
            onSkip={handleSkipAds}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Auto-advance hint for Step 1 */}
      {currentStep === 1 && storeConnected && (
        <div className="text-center animate-in fade-in duration-500">
          <p className="text-sm text-emerald-600 font-medium mb-4">
            Store connected! Moving to next step...
          </p>
        </div>
      )}
    </div>
  );
}
