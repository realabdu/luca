'use client';

import dynamic from 'next/dynamic';

// Dynamically import the content with no SSR to avoid Convex provider issues during static generation
const OverviewContent = dynamic(() => import('@/components/pages/OverviewContent'), {
  ssr: false,
  loading: () => (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 w-1/3"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200"></div>
      </div>
    </div>
  ),
});

export default function Overview() {
  return <OverviewContent />;
}
