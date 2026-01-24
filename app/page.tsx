import dynamic from 'next/dynamic';

// Dynamically import to avoid hydration issues
const LandingPage = dynamic(() => import('@/components/landing/LandingPage'), {
  ssr: true,
});

export default function Home() {
  return <LandingPage />;
}
