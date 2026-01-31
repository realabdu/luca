"use client";

import React from "react";
import { DynamicSparklineSmooth } from "./DynamicSparkline";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { IntegrationPlatform } from "@/types/integrations";

type CardSize = "default" | "hero" | "wide" | "tall";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: number;
  trendType?: "up" | "down" | "neutral";
  trendLabel?: string;
  sparklineData?: { value: number }[];
  className?: string;
  isPinned?: boolean;
  platforms?: IntegrationPlatform[];
  size?: CardSize;
  showSparkline?: boolean;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendType = "neutral",
  trendLabel,
  sparklineData = [],
  className = "",
  isPinned = false,
  platforms = [],
  size = "default",
  showSparkline = true,
}: MetricCardProps) {
  const isUp = trendType === "up";
  const isDown = trendType === "down";
  const hasPlatforms = platforms.length > 0;

  // Size-based classes
  const sizeClasses = {
    default: "p-5",
    hero: "p-6 md:col-span-2",
    wide: "p-5 md:col-span-2 lg:col-span-3",
    tall: "p-5 md:row-span-2",
  };

  // Value size based on card size
  const valueClasses = {
    default: "text-3xl",
    hero: "text-4xl md:text-5xl",
    wide: "text-3xl",
    tall: "text-3xl",
  };

  return (
    <div
      className={`
        relative overflow-hidden border border-border-light bg-white
        card-hover group flex flex-col h-full
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Platform logos in top right */}
      {hasPlatforms && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          {platforms.map((platform) => (
            <div
              key={platform}
              className="size-8 flex items-center justify-center bg-slate-50 border border-border-light"
            >
              <PlatformIcon platform={platform} size={18} />
            </div>
          ))}
        </div>
      )}

      {/* Pinned indicator */}
      {isPinned && !hasPlatforms && (
        <div className="absolute top-4 right-4">
          <span className="material-symbols-outlined text-[16px] text-primary/60 rotate-45">
            push_pin
          </span>
        </div>
      )}

      {/* Label */}
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Value with unit */}
      <div className="flex items-baseline gap-1.5 mb-2 relative z-10">
        {unit && (
          <span className="text-base font-semibold text-text-muted">
            {unit}
          </span>
        )}
        <span
          className={`font-bold text-text-main tracking-tight tabular-nums animate-count ${valueClasses[size]}`}
        >
          {value}
        </span>
      </div>

      {/* Trend Badge */}
      {trend !== undefined && (
        <div className="flex items-center gap-2 mb-auto relative z-10">
          <div
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold
              ${isUp ? "bg-success-muted text-success" : ""}
              ${isDown ? "bg-danger-muted text-danger" : ""}
              ${!isUp && !isDown ? "bg-slate-100 text-text-muted" : ""}
            `}
          >
            {isUp && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M6 2L10 6L8.5 6L8.5 10L3.5 10L3.5 6L2 6L6 2Z" fill="currentColor" />
              </svg>
            )}
            {isDown && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M6 10L2 6L3.5 6L3.5 2L8.5 2L8.5 6L10 6L6 10Z" fill="currentColor" />
              </svg>
            )}
            {!isUp && !isDown && (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
          {trendLabel && (
            <span className="text-xs text-text-subtle">{trendLabel}</span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {showSparkline && sparklineData.length > 0 && (
        <div className="h-12 w-full mt-auto pt-3 -mx-1 relative z-10">
          <DynamicSparklineSmooth
            data={sparklineData}
            width={320}
            height={48}
            upColor="#10B981"
            downColor="#0891B2"
            strokeWidth={2}
            className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}
    </div>
  );
}

// Skeleton loader for MetricCard
export function MetricCardSkeleton({
  size = "default",
  className = "",
}: {
  size?: CardSize;
  className?: string;
}) {
  const sizeClasses = {
    default: "p-5 h-40",
    hero: "p-6 h-48 md:col-span-2",
    wide: "p-5 h-40 md:col-span-2 lg:col-span-3",
    tall: "p-5 h-80 md:row-span-2",
  };

  return (
    <div
      className={`
        border border-border-light bg-white
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <div className="skeleton h-3 w-20 mb-4" />
      <div className="skeleton h-8 w-32 mb-3" />
      <div className="skeleton h-5 w-16 mb-auto" />
      <div className="skeleton h-12 w-full mt-3" />
    </div>
  );
}
