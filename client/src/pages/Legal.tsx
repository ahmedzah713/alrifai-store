/* Style reminder: legal content is calm, readable, and transparent; keep the same Pi-plum frame without decorative clutter. */
import { ArrowLeft, Languages, ShieldCheck, ScrollText } from 'lucide-react';
import { useLocation } from 'wouter';
import { copy, getInitialLanguage, setStoredLanguage, type Language } from '@/lib/i18n';

interface LegalProps {
  kind: 'privacy' | 'terms';
}

export default function Legal({ kind }: LegalProps) {
  const [, navigate] = useLocation();
  const [language, setLanguage] = React.useState<Language>(() => getInitialLanguage());
  const t = copy[language];
  const isArabic = language === 'ar';
  const isPrivacy = kind === 'privacy';
  const Icon = isPrivacy ? ShieldCheck : ScrollText;

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-[#12091f] px-4 py-5 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/')} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-bold text-[#eadcf2] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t.back}
          </button>
          <button type="button" onClick={toggleLanguage} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-black text-[#f5bd4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]">
            <Languages className="h-4 w-4" /> {t.languageShort}
          </button>
        </div>

        <article className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-10">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f5bd4d] text-[#28113f] shadow-[0_0_30px_rgba(245,189,77,.22)]"><Icon className="h-7 w-7" /></div>
          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#f5bd4d]">Pi Match-3</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">{isPrivacy ? t.privacyHeading : t.termsHeading}</h1>
          <p className="mt-7 text-base leading-8 text-[#d5c4df]">{isPrivacy ? t.privacyBody : t.termsBody}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(isPrivacy ? [
              ['Local storage', 'Language and personal bests are kept in your browser.'],
              ['Pi SDK', 'Only the official Pi session identity is used when you sign in.'],
            ] : [
              ['Entertainment', 'This is a puzzle game for personal entertainment.'],
              ['No guarantee', 'Scores do not promise Pi, money, or any financial outcome.'],
            ]).map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <h2 className="text-sm font-black text-[#f5bd4d]">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-[#bba5ca]">{body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

import React from 'react';
