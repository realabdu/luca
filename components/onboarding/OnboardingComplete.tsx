"use client";

import { useRouter } from "next/navigation";
import { PlatformIcon } from "@/components/icons/PlatformIcons";

interface ConnectedIntegration {
  platform: string;
  accountName?: string;
}

interface OnboardingCompleteProps {
  storeConnected: boolean;
  storeName?: string;
  connectedAds: ConnectedIntegration[];
  skippedAds?: boolean;
}

export default function OnboardingComplete({
  storeConnected,
  storeName,
  connectedAds,
  skippedAds,
}: OnboardingCompleteProps) {
  const router = useRouter();

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Success Animation */}
      <div className="text-center space-y-6">
        {/* Checkmark Animation */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute size-24 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
          <div className="relative size-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <span className="material-symbols-outlined text-white text-[40px] animate-in zoom-in duration-300 delay-300">
              check
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-text-main">
            You're All Set!
          </h2>
          <p className="text-text-muted text-lg max-w-md mx-auto">
            Your integrations are connected and ready to sync data.
          </p>
        </div>
      </div>

      {/* Connected Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md mx-auto space-y-4">
        <h3 className="font-semibold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">
            hub
          </span>
          Connected Integrations
        </h3>

        <div className="space-y-3">
          {/* Store */}
          {storeConnected && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <PlatformIcon platform="salla" size={24} />
              <div className="flex-1">
                <p className="font-medium text-text-main text-sm">Salla</p>
                <p className="text-xs text-text-muted">{storeName || "E-commerce Store"}</p>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">
                check_circle
              </span>
            </div>
          )}

          {/* Ads */}
          {connectedAds.map((ad) => (
            <div
              key={ad.platform}
              className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100"
            >
              <PlatformIcon platform={ad.platform as any} size={24} />
              <div className="flex-1">
                <p className="font-medium text-text-main text-sm capitalize">
                  {ad.platform} Ads
                </p>
                <p className="text-xs text-text-muted">
                  {ad.accountName || "Ad Account"}
                </p>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">
                check_circle
              </span>
            </div>
          ))}

          {/* Skipped Ads Warning */}
          {skippedAds && connectedAds.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <span className="material-symbols-outlined text-amber-500 text-[24px]">
                warning
              </span>
              <div className="flex-1">
                <p className="font-medium text-amber-700 text-sm">
                  No Ads Platform Connected
                </p>
                <p className="text-xs text-amber-600">
                  Connect ads later to see ROAS metrics
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What's Next */}
      <div className="text-center space-y-2 text-sm text-text-muted max-w-md mx-auto">
        <p className="font-medium text-text-main">What happens next:</p>
        <ul className="space-y-1 text-left list-disc list-inside">
          <li>Your store data will start syncing automatically</li>
          <li>Historical orders will be imported</li>
          <li>Dashboard metrics will update in real-time</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <button
          onClick={() => router.push("/")}
          className="px-10 h-14 bg-primary text-white font-bold text-lg rounded-xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
