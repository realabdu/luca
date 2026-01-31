'use client';

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function Hero() {
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="Background"
          fill
          className="object-cover opacity-80"
          priority
        />
        {/* Gradient overlay */}
        <div
          className={cn(
            "absolute inset-0",
            dir === 'rtl'
              ? "bg-gradient-to-l from-white via-white/80 to-transparent"
              : "bg-gradient-to-r from-white via-white/80 to-transparent"
          )}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {t.hero.tagline}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight"
          >
            {t.hero.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-600 max-w-2xl leading-relaxed"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <Link
              href="/sign-up"
              className="h-12 px-8 text-base bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium"
            >
              {t.hero.cta_primary}
              <Arrow className="w-4 h-4" />
            </Link>
            <a
              href="#methodology"
              className="h-12 px-8 text-base bg-white/50 backdrop-blur-sm hover:bg-white border border-primary/20 text-primary flex items-center font-medium transition-all"
            >
              {t.hero.cta_secondary}
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-80"
          >
            <div className="text-start">
              <p className="font-bold text-3xl text-primary">{t.hero.stats.revenue}</p>
              <p className="text-sm text-slate-500">{t.hero.stats.revenue_label}</p>
            </div>
            <div className="text-start">
              <p className="font-bold text-3xl text-primary">{t.hero.stats.uplift}</p>
              <p className="text-sm text-slate-500">{t.hero.stats.uplift_label}</p>
            </div>
            <div className="text-start">
              <p className="font-bold text-3xl text-primary">{t.hero.stats.sales}</p>
              <p className="text-sm text-slate-500">{t.hero.stats.sales_label}</p>
            </div>
            <div className="text-start">
              <p className="font-bold text-3xl text-primary">{t.hero.stats.cac}</p>
              <p className="text-sm text-slate-500">{t.hero.stats.cac_label}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
