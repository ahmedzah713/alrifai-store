/* Style reminder: an editorial Pi-plum landing frame with gold action moments, asymmetric art-led composition, crisp tactile controls, and no fake reward promises. */
import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowRight,
  ChevronRight,
  Gamepad2,
  Languages,
  LogIn,
  Play,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePi } from '@/contexts/PiContext';
import { copy, getInitialLanguage, setStoredLanguage, type Language } from '@/lib/i18n';

const HERO_ART = '/manus-storage/pi-match3-hero_1bca0ec7.png';
const MARK_ART = '/manus-storage/pi-match3-mark_446fedca.png';

export default function Home() {
  const [, navigate] = useLocation();
  const { user, login, isLoading } = usePi();
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const t = copy[language];
  const isArabic = language === 'ar';

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen overflow-hidden bg-[#12091f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(125,54,192,0.34),transparent_34%),radial-gradient(circle_at_85%_28%,rgba(246,183,59,0.12),transparent_28%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 rounded-2xl px-2 py-1 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]"
          aria-label={t.home}
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#f5bd4d]/35 bg-[#25103b] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <img src={MARK_ART} alt="" className="h-8 w-8 object-contain" />
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e8c780]">Pi Network</span>
            <span className="block text-lg font-black tracking-tight">{t.brand}</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#eadff3] sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#f5bd4d] shadow-[0_0_12px_#f5bd4d]" />
              {user.username}
            </span>
          )}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-bold text-[#f6edf9] transition hover:border-[#f5bd4d]/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]"
            aria-label={t.language}
          >
            <Languages className="h-4 w-4 text-[#f5bd4d]" />
            <span>{t.languageShort}</span>
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="relative order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f5bd4d]/30 bg-[#f5bd4d]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f7d98f]">
            <Sparkles className="h-3.5 w-3.5" />
            {t.eyebrow}
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-[#fff9ff] sm:text-7xl lg:text-[5.8rem]">
            {t.homeTitle}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#d8c6e6] sm:text-lg sm:leading-8">
            {t.homeSubtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={() => navigate('/game')}
              className="group min-h-14 rounded-2xl bg-[#f5bd4d] px-6 text-base font-black text-[#28113f] shadow-[0_14px_34px_rgba(245,189,77,0.26)] transition hover:-translate-y-0.5 hover:bg-[#ffd36e] active:scale-[0.98]"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {t.start}
              <ArrowRight className="ml-2 h-5 w-5 transition group-hover:translate-x-1 rtl:rotate-180" />
            </Button>
            <button
              type="button"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 text-sm font-bold text-[#eee3f2] transition hover:border-[#f5bd4d]/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]"
            >
              {t.viewHow}
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-[#bba5ca]">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f5bd4d]" /> 8×8 board</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8e5dd3]" /> 20 moves</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#67d5bc]" /> {t.trustTitle}</span>
          </div>
        </div>

        <div className="relative order-1 min-h-[360px] overflow-hidden rounded-[2rem] border border-[#f5bd4d]/20 bg-[#2b1147] shadow-[0_24px_90px_rgba(0,0,0,0.35)] sm:min-h-[500px] lg:order-2">
          <img src={HERO_ART} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b0b2d] via-transparent to-[#2b1147]/25" />
          <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-[#1c0c2e]/75 p-4 backdrop-blur-md sm:inset-x-7 sm:bottom-7 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5bd4d]">Live board</p>
                <p className="mt-1 text-lg font-black">{t.ready}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5bd4d] text-[#28113f] shadow-[0_0_26px_rgba(245,189,77,0.35)]">
                <Gamepad2 className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Gamepad2, title: t.howTitle, body: t.how1 },
            { icon: Trophy, title: t.leaderboard, body: t.how4 },
            { icon: ShieldCheck, title: t.trustTitle, body: t.trustBody },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#f5bd4d]/30">
              <Icon className="h-6 w-6 text-[#f5bd4d]" />
              <h2 className="mt-4 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#c8b4d6]">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#1b0d2d]/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-black text-[#f5bd4d]">{t.legalTitle}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#bba5ca]">{t.footer}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button type="button" onClick={() => navigate('/privacy')} className="rounded-full border border-white/15 px-3 py-2 text-[#eee3f2] transition hover:border-[#f5bd4d]/50">{t.privacy}</button>
            <button type="button" onClick={() => navigate('/terms')} className="rounded-full border border-white/15 px-3 py-2 text-[#eee3f2] transition hover:border-[#f5bd4d]/50">{t.terms}</button>
            {!user && (
              <button type="button" onClick={() => void login()} disabled={isLoading} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[#f5bd4d] transition hover:bg-white/15 disabled:opacity-60">
                <LogIn className="h-3.5 w-3.5" /> {t.signIn}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
