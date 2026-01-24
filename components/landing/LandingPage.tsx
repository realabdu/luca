'use client';

import { LanguageProvider } from "@/lib/i18n";
import LandingNavbar from "./Navbar";
import Hero from "./Hero";
import Methodology from "./Methodology";
import GrowthEcosystem from "./GrowthEcosystem";
import Contact from "./Contact";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-white text-slate-900 selection:bg-primary/10 selection:text-primary">
        <LandingNavbar />
        <main>
          <Hero />
          <Methodology />
          <GrowthEcosystem />
          <Contact />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
