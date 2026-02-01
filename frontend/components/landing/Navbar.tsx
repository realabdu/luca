'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t, dir } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const Logo = () => (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className="w-10 h-10 border-2 border-primary flex flex-col items-center justify-center p-1 bg-transparent shrink-0">
        <div className="flex w-full justify-between leading-none h-[14px]">
          <span className="font-bold text-primary text-[12px] tracking-wider">L</span>
          <span className="font-bold text-primary text-[12px] tracking-wider">U</span>
        </div>
        <div className="flex w-full justify-between leading-none h-[14px]">
          <span className="font-bold text-primary text-[12px] tracking-wider">C</span>
          <span className="font-bold text-primary text-[12px] tracking-wider">A</span>
        </div>
      </div>
      <div className="flex flex-col text-primary">
        <span className="font-bold text-xl tracking-tight leading-none">
          LUCA
        </span>
        <span className="text-[10px] tracking-wider uppercase opacity-80 leading-none mt-1 text-slate-600">
          {language === 'en' ? 'Ecommerce Growth' : 'نمو التجارة الإلكترونية'}
        </span>
      </div>
    </div>
  );

  return (
    <nav
      dir={dir}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "bg-white/80 backdrop-blur-md border-slate-200/50 py-4 shadow-sm"
          : "bg-transparent border-transparent py-6"
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="block">
          <Logo />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#services"
            className="text-sm font-medium transition-colors hover:text-primary text-slate-600"
          >
            {t.nav.expertise}
          </a>
          <a
            href="#methodology"
            className="text-sm font-medium transition-colors hover:text-primary text-slate-600"
          >
            {t.nav.methodology}
          </a>
          <button
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            onClick={toggleLanguage}
            aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">language</span>
            {language === 'en' ? 'العربية' : 'English'}
          </button>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
          >
            {t.nav.signup}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
            <a
              href="#services"
              className="text-base font-medium text-slate-600 py-2 border-b border-slate-100"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.expertise}
            </a>
            <a
              href="#methodology"
              className="text-base font-medium text-slate-600 py-2 border-b border-slate-100"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.methodology}
            </a>
            <button
              className="flex items-center gap-2 text-base font-medium text-slate-600 py-2 border-b border-slate-100"
              onClick={toggleLanguage}
              aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">language</span>
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            <Link
              href="/sign-in"
              className="text-base font-medium text-slate-600 py-2 border-b border-slate-100"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.login}
            </Link>
            <Link
              href="/sign-up"
              className="w-full px-4 py-3 bg-primary text-white text-base font-medium text-center hover:bg-primary/90 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {t.nav.signup}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
