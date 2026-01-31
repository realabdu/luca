'use client';

import dynamic from 'next/dynamic';

// Dynamically import the content with no SSR to avoid Convex provider issues during static generation
const LiveFeedContent = dynamic(() => import('@/components/pages/LiveFeedContent'), {
  ssr: false,
  loading: () => (
    <div className="p-8 max-w-[1440px] mx-auto flex gap-8">
      <div className="flex-1 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 w-1/3"></div>
        <div className="h-12 bg-gray-200"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200"></div>
          ))}
        </div>
      </div>
      <div className="w-[360px] h-64 bg-gray-200"></div>
    </div>
  ),
});

export default function LiveFeed() {
  return <LiveFeedContent />;
}
