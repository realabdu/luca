'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

type Translations = {
  nav: {
    expertise: string;
    methodology: string;
    about: string;
    contact: string;
    login: string;
    signup: string;
  };
  hero: {
    tagline: string;
    title: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    stats: {
      revenue: string;
      revenue_label: string;
      uplift: string;
      uplift_label: string;
      sales: string;
      sales_label: string;
      cac: string;
      cac_label: string;
    }
  };
  methodology: {
    badge: string;
    title: string;
    description: string;
    steps: {
      audit: { title: string; subtitle: string; desc: string };
      fix: { title: string; subtitle: string; desc: string };
      scale: { title: string; subtitle: string; desc: string };
      optimize: { title: string; subtitle: string; desc: string };
    }
  };
  ecosystem: {
    badge: string;
    title: string;
    description: string;
    services: {
      positioning: { title: string; desc: string };
      pricing: { title: string; desc: string };
      cx: { title: string; desc: string };
      marketing: { title: string; desc: string };
      logistics: { title: string; desc: string };
      identity: { title: string; desc: string };
    }
  };
  contact: {
    title: string;
    subtitle: string;
    office: string;
    office_label: string;
    email_label: string;
    form: {
      name: string;
      email: string;
      company: string;
      message: string;
      submit: string;
    }
  };
};

const translations: Record<Language, Translations> = {
  en: {
    nav: {
      expertise: "Expertise",
      methodology: "Methodology",
      about: "About",
      contact: "Contact Us",
      login: "Login",
      signup: "Get Started"
    },
    hero: {
      tagline: "Your Ecommerce Growth Team",
      title: "Grow Your Online Store. Starting Tomorrow.",
      subtitle: "We help Saudi ecommerce brands sell more, spend smarter, and scale faster. No fluff—just real results backed by data.",
      cta_primary: "Start Free Trial",
      cta_secondary: "See How It Works",
      stats: {
        revenue: "500M+",
        revenue_label: "In Sales We've Helped Generate",
        uplift: "30%+",
        uplift_label: "Better Conversion Rates",
        sales: "35%+",
        sales_label: "Average Sales Growth",
        cac: "20%",
        cac_label: "Saved on Customer Acquisition"
      }
    },
    methodology: {
      badge: "How We Work",
      title: "Four Steps to Real Growth",
      description: "A simple, proven approach. We find what's broken, fix it fast, then scale what works.",
      steps: {
        audit: { title: "Audit", subtitle: "Analysis", desc: "We examine every part of your store and clearly identify problems and opportunities." },
        fix: { title: "Fix", subtitle: "Correction", desc: "We fix the obvious issues and improve what boosts your sales quickly." },
        scale: { title: "Scale", subtitle: "Expansion", desc: "We expand your reach and grow your market share with a strategic approach." },
        optimize: { title: "Optimize", subtitle: "Refinement", desc: "We maintain your growth and improve efficiency for the long term." }
      }
    },
    ecosystem: {
      badge: "Our Services",
      title: "Everything Your Store Needs to Grow",
      description: "We don't just fix one thing. We look at your whole business and make every part work better together.",
      services: {
        positioning: { title: "Brand Positioning", desc: "We analyze your market, map your competitors, and find opportunities others miss." },
        pricing: { title: "Pricing Strategy", desc: "We optimize your margins, benchmark competitor pricing, and maximize seasonal sales." },
        cx: { title: "Customer Experience", desc: "We improve your customer satisfaction scores through better service delivery." },
        marketing: { title: "Marketing Strategy", desc: "We review your channels, sharpen your targeting, and align your messaging." },
        logistics: { title: "Logistics", desc: "We speed up your shipping and cut costs without sacrificing quality." },
        identity: { title: "Identity & Packaging", desc: "We make your unboxing experience match your brand promise and build loyalty." }
      }
    },
    contact: {
      title: "Ready to Grow?",
      subtitle: "Let's talk about your store. Book a free call and we'll show you exactly where your biggest opportunities are—no strings attached.",
      office: "Riyadh, Saudi Arabia",
      office_label: "Office",
      email_label: "Email",
      form: {
        name: "Full Name",
        email: "Email",
        company: "Company Name",
        message: "Tell us about your store",
        submit: "Book Free Call"
      }
    }
  },
  ar: {
    nav: {
      expertise: "خدماتنا",
      methodology: "منهجية العمل",
      about: "من نحن",
      contact: "تواصل معنا",
      login: "تسجيل الدخول",
      signup: "ابدأ الآن"
    },
    hero: {
      tagline: "فريق نمو متجرك",
      title: "نمّي متجرك. ابدأ من بكرة.",
      subtitle: "نساعد المتاجر السعودية تبيع أكثر، تصرف بذكاء، وتكبر أسرع. بدون كلام كثير—نتائج حقيقية مبنية على بيانات.",
      cta_primary: "ابدأ تجربتك المجانية",
      cta_secondary: "شوف كيف نشتغل",
      stats: {
        revenue: "+٥٠٠ مليون",
        revenue_label: "مبيعات ساعدنا عملائنا يحققونها",
        uplift: "+٣٠٪",
        uplift_label: "تحسن في معدل التحويل",
        sales: "+٣٥٪",
        sales_label: "متوسط زيادة المبيعات",
        cac: "٢٠٪",
        cac_label: "توفير في تكلفة جذب العميل"
      }
    },
    methodology: {
      badge: "كيف نشتغل",
      title: "أربع خطوات للنمو الحقيقي",
      description: "طريقة بسيطة ومجربة. نكتشف المشكلة، نصلحها بسرعة، ونكبّر اللي يشتغل.",
      steps: {
        audit: { title: "تحليل", subtitle: "التشخيص", desc: "نفحص كل شي في متجرك ونطلع لك بالمشاكل والفرص بوضوح." },
        fix: { title: "تحسين", subtitle: "التصحيح", desc: "نصلح المشاكل الواضحة ونحسن اللي يرفع مبيعاتك بسرعة." },
        scale: { title: "توسع", subtitle: "النمو", desc: "نوسع وصولك ونزيد حصتك السوقية بطريقة مدروسة." },
        optimize: { title: "تطوير", subtitle: "الاستدامة", desc: "نحافظ على النمو ونحسن الكفاءة على المدى الطويل." }
      }
    },
    ecosystem: {
      badge: "خدماتنا",
      title: "كل اللي يحتاجه متجرك للنمو",
      description: "ما نركز على شي واحد بس. نشوف كل متجرك ونخلي كل جزء يشتغل أحسن مع الباقي.",
      services: {
        positioning: { title: "تموضع العلامة التجارية", desc: "نحلل سوقك، نرسم خريطة المنافسين، ونكتشف الفرص اللي غيرك ما شافها." },
        pricing: { title: "استراتيجية التسعير", desc: "نحسن هوامشك، نقارن أسعارك بالسوق، ونعظم مبيعات المواسم." },
        cx: { title: "تجربة العميل", desc: "نرفع رضا عملائك من خلال تحسين جودة الخدمة والتوصيل." },
        marketing: { title: "الاستراتيجية التسويقية", desc: "نراجع قنواتك، نحدد استهدافك، ونوحد رسالتك التسويقية." },
        logistics: { title: "اللوجستيات", desc: "نسرع شحنك ونقلل تكاليفك بدون ما نأثر على الجودة." },
        identity: { title: "الهوية والتغليف", desc: "نخلي تجربة فتح الصندوق تعكس وعد علامتك وتبني ولاء العميل." }
      }
    },
    contact: {
      title: "مستعد تكبّر متجرك؟",
      subtitle: "خلنا نتكلم عن متجرك. احجز مكالمة مجانية ونوريك بالضبط وين أكبر فرصك—بدون أي التزام.",
      office: "الرياض، المملكة العربية السعودية",
      office_label: "المكتب",
      email_label: "البريد الإلكتروني",
      form: {
        name: "الاسم الكامل",
        email: "البريد الإلكتروني",
        company: "اسم الشركة",
        message: "كلمنا عن متجرك",
        submit: "احجز مكالمتك المجانية"
      }
    }
  }
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translations[language],
    dir: (language === 'ar' ? 'rtl' : 'ltr') as 'ltr' | 'rtl'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
