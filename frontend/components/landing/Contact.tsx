'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  message: z.string().min(10, "Please provide more detail about your needs"),
});

type FormData = z.infer<typeof formSchema>;

export default function Contact() {
  const { t, dir } = useLanguage();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: "",
    },
  });

  function onSubmit(values: FormData) {
    console.log("Form submitted:", values);
    setSubmitted(true);
    reset();
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <section className="py-24 bg-primary text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-1/2 h-full bg-gradient-to-${dir === 'rtl' ? 'r' : 'l'} from-white/5 to-transparent pointer-events-none`} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-1/2 text-start">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              {t.contact.title}
            </h2>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              {t.contact.subtitle}
            </p>

            <div className="space-y-6 text-white/70">
              <p>
                <strong className="text-white block mb-1">{t.contact.office_label}</strong>
                {t.contact.office}
              </p>
              <p>
                <strong className="text-white block mb-1">{t.contact.email_label}</strong>
                growth@luca.sa
              </p>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="bg-white text-slate-900 p-8 shadow-2xl">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Thank you!</h3>
                  <p className="text-slate-600">We&apos;ll be in touch shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-start">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t.contact.form.name}
                      </label>
                      <input
                        {...register("name")}
                        className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t.contact.form.email}
                      </label>
                      <input
                        type="email"
                        {...register("email")}
                        className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.contact.form.company}
                    </label>
                    <input
                      {...register("company")}
                      className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                    {errors.company && (
                      <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.contact.form.message}
                    </label>
                    <textarea
                      {...register("message")}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-white py-4 text-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending..." : t.contact.form.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
