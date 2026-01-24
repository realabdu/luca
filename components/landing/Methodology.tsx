'use client';

import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Methodology() {
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const steps = [
    { id: "01", ...t.methodology.steps.audit },
    { id: "02", ...t.methodology.steps.fix },
    { id: "03", ...t.methodology.steps.scale },
    { id: "04", ...t.methodology.steps.optimize }
  ];

  return (
    <section id="methodology" className="py-0 bg-primary text-white relative overflow-hidden">
      {/* Geometric Accents */}
      <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-1/3 h-full bg-white/5 ${dir === 'rtl' ? '-skew-x-12' : 'skew-x-12'} pointer-events-none`} />
      <div className={`absolute bottom-0 ${dir === 'rtl' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'} w-64 h-64 border-[20px] border-white/5 pointer-events-none translate-y-1/2`} />

      <div className="container mx-auto px-6 py-24 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-block py-1 px-3 border border-white/30 text-sm font-medium tracking-widest uppercase mb-4"
            >
              {t.methodology.badge}
            </motion.span>
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              {t.methodology.title}
            </h2>
          </div>
          <div className="hidden md:block max-w-sm text-start">
            <p className="text-white/80 leading-relaxed">
              {t.methodology.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group relative border-t border-white/20 p-8 hover:bg-white hover:text-primary transition-all duration-500 h-full flex flex-col justify-between min-h-[320px]"
            >
              {/* Vertical line separator */}
              <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-0 h-full w-[1px] bg-white/20 group-hover:bg-primary/10 transition-colors hidden md:block`} />

              <div>
                <div className="flex justify-between items-start mb-12">
                  <span className="text-5xl font-bold opacity-30 group-hover:opacity-100 transition-opacity" dir="ltr">
                    {step.id}
                  </span>
                  <Arrow className={`w-6 h-6 ${dir === 'rtl' ? 'rotate-45' : '-rotate-45'} opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:rotate-0`} />
                </div>

                <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                <span className="text-xs tracking-widest uppercase opacity-60 mb-6 block">
                  {step.subtitle}
                </span>
              </div>

              <p className="text-sm opacity-70 group-hover:opacity-100 leading-relaxed font-light">
                {step.desc}
              </p>

              {/* Bottom active line */}
              <div className={`absolute bottom-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-0 h-1 bg-primary group-hover:w-full transition-all duration-500`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
