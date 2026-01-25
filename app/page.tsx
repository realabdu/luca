export const runtime = 'edge';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">Luca</h1>
        <p className="text-lg text-slate-600">Marketing Analytics Platform</p>
        <a
          href="/sign-in"
          className="inline-block px-6 py-3 bg-primary text-white hover:bg-primary/90"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
