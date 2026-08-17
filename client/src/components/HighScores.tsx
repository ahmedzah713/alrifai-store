/* Style reminder: leaderboard rows are quiet, legible, and reward progress without claiming financial rewards. */
import { Medal, Trophy } from 'lucide-react';
import { usePi } from '@/contexts/PiContext';
import { copy, type Language } from '@/lib/i18n';

interface HighScoresProps {
  language: Language;
}

export default function HighScores({ language }: HighScoresProps) {
  const { highScores } = usePi();
  const t = copy[language];
  const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5bd4d]">Personal bests</p>
          <h2 className="mt-1 text-lg font-black text-[#fff9ff]">{t.leaderboard}</h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f5bd4d]/15 text-[#f5bd4d]"><Trophy className="h-5 w-5" /></div>
      </div>

      {highScores.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center">
          <p className="text-sm font-bold text-[#e6d8ee]">{t.leaderboardEmpty}</p>
          <p className="mt-1 text-xs leading-5 text-[#a997b9]">{t.leaderboardHint}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {highScores.map((entry, index) => (
            <div key={`${entry.date}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/10 px-3 py-2.5 transition hover:border-[#f5bd4d]/25 hover:bg-white/5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-black text-[#f5bd4d]">
                  {index === 0 ? <Trophy className="h-4 w-4" /> : index < 3 ? <Medal className="h-4 w-4" /> : `#${index + 1}`}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#f5edf8]">{entry.username}</p>
                  <p className="text-[10px] text-[#a997b9]">{new Date(entry.date).toLocaleDateString(dateLocale)}</p>
                </div>
              </div>
              <p className="text-lg font-black text-[#f5bd4d]">{entry.score}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
