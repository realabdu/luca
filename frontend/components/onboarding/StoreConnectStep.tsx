"use client";

import { PlatformIcon } from "@/components/icons/PlatformIcons";

interface StoreConnectStepProps {
  sallaConnected: boolean;
  sallaAccountName?: string;
  onConnect: (platform: "salla") => void;
}

export default function StoreConnectStep({
  sallaConnected,
  sallaAccountName,
  onConnect,
}: StoreConnectStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 rounded-2xl mb-4">
          <span className="material-symbols-outlined text-primary text-[32px]">
            storefront
          </span>
        </div>
        <h2 className="text-2xl font-bold text-text-main">
          Connect Your Store
        </h2>
        <p className="text-text-muted max-w-md mx-auto">
          We'll sync your orders, customers, and revenue data to give you accurate analytics and attribution.
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid gap-4 max-w-lg mx-auto">
        {/* Salla Card */}
        <div
          className={`
            relative flex items-center gap-5 p-5 border-2 rounded-xl transition-all duration-300
            ${
              sallaConnected
                ? "bg-emerald-50 border-emerald-200 shadow-sm"
                : "bg-white border-gray-200 hover:border-primary/50 hover:shadow-md cursor-pointer"
            }
          `}
          onClick={() => !sallaConnected && onConnect("salla")}
        >
          {/* Recommended Badge */}
          {!sallaConnected && (
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-white text-[10px] font-bold uppercase tracking-wide rounded">
              Recommended
            </div>
          )}

          {/* Platform Icon */}
          <div className="size-14 flex items-center justify-center bg-white border border-gray-100 rounded-xl p-2 shadow-sm">
            <PlatformIcon platform="salla" size={40} />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-main">Salla</h3>
              {sallaConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 bg-emerald-500 rounded-full"></span>
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted">
              {sallaConnected
                ? `Connected to ${sallaAccountName || "your store"}`
                : "Saudi Arabia's leading e-commerce platform"}
            </p>
          </div>

          {/* Action */}
          {sallaConnected ? (
            <span className="material-symbols-outlined text-emerald-500 text-[28px]">
              check_circle
            </span>
          ) : (
            <span className="material-symbols-outlined text-gray-400 text-[24px]">
              arrow_forward
            </span>
          )}
        </div>

        {/* Zid Card - Coming Soon */}
        <div className="flex items-center gap-5 p-5 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 opacity-60">
          <div className="size-14 flex items-center justify-center bg-white border border-gray-100 rounded-xl p-3 grayscale">
            <span className="material-symbols-outlined text-gray-400 text-[28px]">
              store
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text-muted">Zid</h3>
            <p className="text-sm text-text-muted">E-commerce platform</p>
          </div>
          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded">
            Coming Soon
          </span>
        </div>

        {/* Shopify Card - Coming Soon */}
        <div className="flex items-center gap-5 p-5 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 opacity-60">
          <div className="size-14 flex items-center justify-center bg-white border border-gray-100 rounded-xl p-3 grayscale">
            <span className="material-symbols-outlined text-gray-400 text-[28px]">
              shopping_bag
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text-muted">Shopify</h3>
            <p className="text-sm text-text-muted">Global e-commerce platform</p>
          </div>
          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Help Text */}
      {!sallaConnected && (
        <p className="text-center text-sm text-text-muted">
          Click on Salla to connect your store via OAuth. Your data stays secure.
        </p>
      )}
    </div>
  );
}
