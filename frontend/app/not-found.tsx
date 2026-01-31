import Link from "next/link";

export const runtime = "edge";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="text-xl text-gray-600">Page Not Found</h2>
        <p className="text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
