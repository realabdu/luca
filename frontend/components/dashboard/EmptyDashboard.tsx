"use client";

import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/components/icons/PlatformIcons";

interface IntegrationStatus {
  salla?: { connected: boolean; accountName?: string };
  snapchat?: { connected: boolean; accountName?: string };
  meta?: { connected: boolean; accountName?: string };
  google?: { connected: boolean; accountName?: string };
  tiktok?: { connected: boolean; accountName?: string };
}

interface EmptyDashboardProps {
  integrations?: IntegrationStatus;
  onSetup?: () => void;
}

export default function EmptyDashboard({
  integrations,
  onSetup,
}: EmptyDashboardProps) {
  const router = useRouter();

  const handleSetup = () => {
    if (onSetup) {
      onSetup();
    } else {
      router.push("/onboarding");
    }
  };

  const storeConnected = integrations?.salla?.connected;
  const adsConnected =
    integrations?.snapchat?.connected ||
    integrations?.meta?.connected ||
    integrations?.google?.connected ||
    integrations?.tiktok?.connected;

  // Determine which message to show
  let title = "Welcome to Luca";
  let description = "Connect your store and advertising platforms to see your unified analytics.";
  let actionText = "Complete Setup";

  if (storeConnected && !adsConnected) {
    title = "Connect Your Ads";
    description = "Your store is connected! Now connect an advertising platform to see ROAS, ad spend, and campaign performance.";
    actionText = "Connect Ads";
  } else if (!storeConnected && adsConnected) {
    title = "Connect Your Store";
    description = "Connect your e-commerce store to see revenue, orders, and accurate profit calculations.";
    actionText = "Connect Store";
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in duration-500">
      {/* Illustration */}
      <div className="relative mb-10">
        {/* Background Decoration */}
        <div className="absolute inset-0 -m-12 bg-primary/10 blur-3xl"></div>

        {/* Icon Stack */}
        <div className="relative flex items-center justify-center">
          <div className="size-32 bg-white flex items-center justify-center shadow-xl border border-slate-100">
            <span className="material-symbols-outlined text-slate-200 text-[64px]">
              insights
            </span>
          </div>

          {/* Store Indicator */}
          <div className="absolute -right-3 -top-3 size-14 bg-white shadow-lg border border-slate-100 flex items-center justify-center">
            {storeConnected ? (
              <PlatformIcon platform="salla" size={32} />
            ) : (
              <span className="material-symbols-outlined text-slate-300 text-[28px]">
                storefront
              </span>
            )}
            {storeConnected && (
              <span className="absolute -bottom-1 -right-1 size-5 bg-success flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[14px]">
                  check
                </span>
              </span>
            )}
          </div>

          {/* Ads Indicator */}
          <div className="absolute -left-3 -bottom-3 size-14 bg-white shadow-lg border border-slate-100 flex items-center justify-center">
            {adsConnected ? (
              <span className="material-symbols-outlined text-primary text-[28px]">
                campaign
              </span>
            ) : (
              <span className="material-symbols-outlined text-slate-300 text-[28px]">
                campaign
              </span>
            )}
            {adsConnected && (
              <span className="absolute -bottom-1 -right-1 size-5 bg-success flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[14px]">
                  check
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-bold text-text-main tracking-tight">{title}</h2>
        <p className="text-text-muted leading-relaxed">{description}</p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleSetup}
        className="mt-8 px-8 h-12 bg-primary text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">add_link</span>
        {actionText}
      </button>

      {/* Missing Integrations */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {!storeConnected && (
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/20 text-warning text-sm font-medium hover:bg-warning/15 transition-all"
            onClick={() => router.push("/integrations")}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Store not connected
          </button>
        )}
        {!adsConnected && (
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/20 text-warning text-sm font-medium hover:bg-warning/15 transition-all"
            onClick={() => router.push("/integrations")}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            No ads platform connected
          </button>
        )}
      </div>

      {/* Help Link */}
      <p className="mt-8 text-sm text-text-muted">
        Need help?{" "}
        <button
          onClick={() => router.push("/integrations")}
          className="text-primary font-medium hover:underline"
        >
          View all integrations
        </button>
      </p>
    </div>
  );
}
