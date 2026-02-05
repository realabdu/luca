'use client';

import dynamic from 'next/dynamic';

export const runtime = 'edge';

// Dynamically import the content with no SSR to avoid Convex provider issues during static generation
const CampaignsContent = dynamic(() => import('@/components/pages/CampaignsContent'), {
  ssr: false,
  loading: () => (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 w-1/3"></div>
        <div className="h-12 bg-gray-200"></div>
        <div className="h-96 bg-gray-200"></div>
      </div>
    </div>
  ),
});

export default function Campaigns() {
  return <CampaignsContent />;
}
