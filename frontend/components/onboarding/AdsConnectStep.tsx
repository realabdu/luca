"use client";

import { PlatformIcon, PLATFORM_COLORS } from "@/components/icons/PlatformIcons";
import { IntegrationPlatform } from "@/types/integrations";

type AdPlatform = "snapchat" | "meta" | "google" | "tiktok";

interface ConnectedPlatform {
  platform: AdPlatform;
  accountName?: string;
}

interface AdsConnectStepProps {
  connectedPlatforms: ConnectedPlatform[];
  onConnect: (platform: AdPlatform) => void;
  onSkip: () => void;
  onComplete: () => void;
}

const AD_PLATFORMS: {
  platform: AdPlatform;
  name: string;
  description: string;
  recommended?: boolean;
}[] = [
  {
    platform: "snapchat",
    name: "Snapchat Ads",
    description: "Connect Snapchat marketing accounts",
    recommended: true,
  },
  {
    platform: "meta",
    name: "Meta Ads",
    description: "Facebook & Instagram advertising",
  },
  {
    platform: "google",
    name: "Google Ads",
    description: "Search & Display campaigns",
  },
  {
    platform: "tiktok",
    name: "TikTok Ads",
    description: "TikTok advertising platform",
  },
];

export default function AdsConnectStep({
  connectedPlatforms,
  onConnect,
  onSkip,
  onComplete,
}: AdsConnectStepProps) {
  const hasAnyConnection = connectedPlatforms.length > 0;

  const isPlatformConnected = (platform: AdPlatform) =>
    connectedPlatforms.some((p) => p.platform === platform);

  const getAccountName = (platform: AdPlatform) =>
    connectedPlatforms.find((p) => p.platform === platform)?.accountName;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center size-16 bg-secondary/10 rounded-2xl mb-4">
          <span className="material-symbols-outlined text-secondary-foreground text-[32px]">
            campaign
          </span>
        </div>
        <h2 className="text-2xl font-bold text-text-main">
          Connect Your Ads
        </h2>
        <p className="text-text-muted max-w-md mx-auto">
          Track your ad spend and calculate true ROAS by connecting your advertising platforms.
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {AD_PLATFORMS.map(({ platform, name, description, recommended }) => {
          const isConnected = isPlatformConnected(platform);
          const accountName = getAccountName(platform);

          return (
            <div
              key={platform}
              className={`
                relative flex flex-col p-5 border-2 rounded-xl transition-all duration-300
                ${
                  isConnected
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-gray-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
                }
              `}
              onClick={() => !isConnected && onConnect(platform)}
            >
              {/* Recommended Badge */}
              {recommended && !isConnected && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-white text-[10px] font-bold uppercase tracking-wide rounded">
                  Recommended
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                {/* Platform Icon */}
                <div
                  className="size-12 flex items-center justify-center border border-gray-100 rounded-lg p-2"
                  style={{ backgroundColor: `${PLATFORM_COLORS[platform]}08` }}
                >
                  <PlatformIcon platform={platform} size={28} />
                </div>

                {/* Status */}
                {isConnected ? (
                  <span className="material-symbols-outlined text-emerald-500 text-[24px]">
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-[20px]">
                    add_circle
                  </span>
                )}
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-main">{name}</h3>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {isConnected && accountName ? accountName : description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connected Summary */}
      {hasAnyConnection && (
        <div className="text-center">
          <p className="text-sm text-emerald-600 font-medium">
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">
              check_circle
            </span>
            {connectedPlatforms.length} platform{connectedPlatforms.length > 1 ? "s" : ""} connected
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        {hasAnyConnection ? (
          <button
            onClick={onComplete}
            className="w-full sm:w-auto px-8 h-12 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            Continue to Dashboard
          </button>
        ) : (
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-main transition-colors"
          >
            Skip for now
            <span className="block text-xs text-text-muted/70">
              You can connect ads later
            </span>
          </button>
        )}
      </div>

      {/* Skip Warning */}
      {!hasAnyConnection && (
        <p className="text-center text-xs text-text-muted max-w-md mx-auto">
          Without ad platforms connected, you won't be able to see ROAS, ad spend, or campaign performance metrics.
        </p>
      )}
    </div>
  );
}
