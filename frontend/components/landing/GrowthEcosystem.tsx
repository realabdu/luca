'use client';

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Target,
  Users,
  Megaphone,
  Truck,
  PackageCheck,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export default function GrowthEcosystem() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const { t, dir, language } = useLanguage();

  const services = [
    { id: 0, icon: Target, ...t.ecosystem.services.positioning },
    { id: 1, icon: BarChart3, ...t.ecosystem.services.pricing },
    { id: 2, icon: Users, ...t.ecosystem.services.cx },
    { id: 3, icon: Megaphone, ...t.ecosystem.services.marketing },
    { id: 4, icon: Truck, ...t.ecosystem.services.logistics },
    { id: 5, icon: PackageCheck, ...t.ecosystem.services.identity }
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % services.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, services.length]);

  return (
    <section id="services" className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="text-primary font-bold tracking-widest text-sm uppercase mb-2 block">{t.ecosystem.badge}</span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            {t.ecosystem.title}
          </h2>
          <p className="text-lg text-slate-600">
            {t.ecosystem.description}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">

          {/* Interactive Atom/Orbit Visual */}
          <div
            className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px] shrink-0"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {/* Orbital Rings */}
            <div className="absolute inset-0 rounded-full border border-primary/10" />
            <div className="absolute inset-[15%] rounded-full border border-primary/10" />
            <div className="absolute inset-[30%] rounded-full border border-primary/10" />

            {/* Rotating Subtle Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[5%] rounded-full border border-dashed border-primary/20"
            />

            {/* Central Core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 bg-primary rounded-full shadow-2xl flex items-center justify-center z-20 ring-8 ring-primary/5">
              <div className="text-center text-white">
                <span className="block font-bold text-xl md:text-2xl tracking-tight">LUCA</span>
                <span className="block text-[10px] uppercase tracking-widest opacity-80">Core</span>
              </div>
            </div>

            {/* Satellites */}
            {services.map((service, index) => {
              const angleDeg = index * 60 - 90;
              const angleRad = (angleDeg * Math.PI) / 180;
              const x = 50 + 40 * Math.cos(angleRad);
              const y = 50 + 40 * Math.sin(angleRad);

              return (
                <Fragment key={index}>
                  {/* Connecting Line for Active Item */}
                  <div
                    className={cn(
                      "absolute top-1/2 left-1/2 h-[3px] origin-left z-10 transition-all duration-500 rounded-full",
                      activeIndex === index
                        ? "w-[42%] bg-gradient-to-r from-primary to-transparent opacity-100"
                        : "w-[0%] bg-transparent opacity-0"
                    )}
                    style={{
                      transform: `rotate(${angleDeg}deg)`
                    }}
                  />

                  <motion.button
                    className={cn(
                      "absolute w-12 h-12 md:w-16 md:h-16 -ml-6 -mt-6 md:-ml-8 md:-mt-8 rounded-full flex items-center justify-center border-2 shadow-lg z-30 transition-all duration-500",
                      activeIndex === index
                        ? "bg-white border-primary text-primary scale-110 md:scale-125 ring-4 ring-primary/20"
                        : "bg-white border-white text-slate-500 hover:text-primary hover:border-primary/50 hover:scale-110"
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => { setActiveIndex(index); setIsAutoPlaying(false); }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <service.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </motion.button>
                </Fragment>
              )
            })}
          </div>

          {/* Active Content Display */}
          <div className="w-full lg:w-[400px] min-h-[300px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
                transition={{ duration: 0.3 }}
                className={`bg-white p-8 ${dir === 'rtl' ? 'border-r-4' : 'border-l-4'} border-primary shadow-lg text-start`}
              >
                <div className="flex items-center gap-3 mb-4 text-primary opacity-50 font-mono text-sm">
                  <span>0{activeIndex + 1}</span>
                  <span className="w-12 h-[1px] bg-current" />
                  <span>06</span>
                </div>

                <h3 className="text-3xl font-bold text-slate-900 mb-4">
                  {services[activeIndex].title}
                </h3>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  {services[activeIndex].desc}
                </p>

                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{language === 'ar' ? 'تحسين مبني على البيانات' : 'Data-driven optimization'}</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{language === 'ar' ? 'بنية تحتية قابلة للتوسع' : 'Scalable infrastructure'}</span>
                  </li>
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
