'use client';

import dynamic from 'next/dynamic';
import { MetricCardSkeleton } from '@/components/dashboard/MetricCard';

// Dynamically import the content with no SSR to avoid Convex provider issues during static generation
const OverviewContent = dynamic(() => import('@/components/pages/OverviewContent'), {
  ssr: false,
  loading: () => (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-32 skeleton mb-2" />
          <div className="h-4 w-64 skeleton" />
        </div>
        <div className="h-10 w-48 skeleton" />
      </div>
      {/* Main metrics - 3 column */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton size="hero" className="lg:col-span-1" />
      </div>
      {/* Secondary metrics - 4 column */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <MetricCardSkeleton key={i} />)}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
        <div className="bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
      </div>
    </div>
  ),
});

export default function Overview() {
  return <OverviewContent />;
}
