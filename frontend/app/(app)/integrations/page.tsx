"use client";

import dynamic from "next/dynamic";

const IntegrationsContent = dynamic(
  () => import("@/components/pages/IntegrationsContent"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 max-w-[1000px] mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="h-4 w-48 bg-slate-200 animate-pulse" />
        <div className="space-y-2 pb-4 border-b border-border-light">
          <div className="h-8 w-72 bg-slate-200 animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 animate-pulse" />
        </div>

        {/* Progress steps skeleton */}
        <div className="flex justify-between py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="size-8 bg-slate-200 animate-pulse" />
              <div className="h-4 w-24 bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* E-commerce section skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-40 bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-5 bg-white border border-border-light"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-12 bg-slate-200 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-24 bg-slate-200 animate-pulse" />
                    <div className="h-3 w-32 bg-slate-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-9 w-full bg-slate-100 animate-pulse mt-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Ads section skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-48 bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 bg-white border border-border-light"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="size-10 bg-slate-200 animate-pulse" />
                  <div className="h-5 w-16 bg-slate-100 animate-pulse" />
                </div>
                <div className="h-5 w-24 bg-slate-200 animate-pulse mb-2" />
                <div className="h-3 w-32 bg-slate-100 animate-pulse mb-4" />
                <div className="h-9 w-full bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}
