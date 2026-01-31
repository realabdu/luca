'use client';

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white py-12 border-t border-slate-200/50">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-slate-900">
            LUCA
          </span>
          <span className="text-slate-500 text-sm">&copy; 2026 All rights reserved.</span>
        </div>

        <div className="flex gap-6 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
}
