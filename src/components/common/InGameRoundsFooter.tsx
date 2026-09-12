import React from 'react';

interface InGameRoundsFooterProps {
  totalRounds: number;
  currentRound: number;
  roundsScores: number[];
  accentColor?: 'sky' | 'rose' | 'emerald' | 'amber' | 'violet' | 'indigo' | 'orange' | 'purple' | 'fuchsia' | 'cyan' | 'teal';
  unit?: string;
}

export const InGameRoundsFooter: React.FC<InGameRoundsFooterProps> = ({
  totalRounds,
  currentRound,
  roundsScores,
  accentColor = 'sky',
  unit = '',
}) => {
  const colorStyles: Record<string, { active: string; scored: string; default: string }> = {
    sky: {
      active: 'border-sky-400 bg-sky-500/15 text-sky-900 shadow-xs ring-1 ring-sky-400/40',
      scored: 'border-sky-300/80 bg-sky-50/80 text-sky-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    rose: {
      active: 'border-rose-400 bg-rose-500/15 text-rose-900 shadow-xs ring-1 ring-rose-400/40',
      scored: 'border-rose-300/80 bg-rose-50/80 text-rose-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    emerald: {
      active: 'border-emerald-400 bg-emerald-500/15 text-emerald-900 shadow-xs ring-1 ring-emerald-400/40',
      scored: 'border-emerald-300/80 bg-emerald-50/80 text-emerald-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    amber: {
      active: 'border-amber-400 bg-amber-500/15 text-amber-900 shadow-xs ring-1 ring-amber-400/40',
      scored: 'border-amber-300/80 bg-amber-50/80 text-amber-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    violet: {
      active: 'border-violet-400 bg-violet-500/15 text-violet-900 shadow-xs ring-1 ring-violet-400/40',
      scored: 'border-violet-300/80 bg-violet-50/80 text-violet-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    indigo: {
      active: 'border-indigo-400 bg-indigo-500/15 text-indigo-900 shadow-xs ring-1 ring-indigo-400/40',
      scored: 'border-indigo-300/80 bg-indigo-50/80 text-indigo-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
    teal: {
      active: 'border-teal-400 bg-teal-500/15 text-teal-900 shadow-xs ring-1 ring-teal-400/40',
      scored: 'border-teal-300/80 bg-teal-50/80 text-teal-700 font-bold',
      default: 'border-slate-200/70 bg-white/70 text-slate-400',
    },
  };

  const currentStyle = colorStyles[accentColor] || colorStyles.sky;

  return (
    <footer className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md mx-auto rounded-2xl bg-white/85 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm py-2 px-3 sm:px-4 transition-all">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
          {Array.from({ length: totalRounds }).map((_, idx) => {
            const score = roundsScores[idx];
            const isActive = currentRound === idx + 1 && score === undefined;
            return (
              <div
                key={idx}
                className={`py-1 px-1 rounded-xl border text-[10px] font-mono transition-all ${
                  score !== undefined
                    ? currentStyle.scored
                    : isActive
                    ? currentStyle.active
                    : currentStyle.default
                }`}
              >
                <div className="text-[9px] opacity-75 font-semibold">R{idx + 1}</div>
                <div className="font-black text-slate-900 text-[11px] truncate">
                  {score !== undefined ? `${score}${unit ? ` ${unit}` : ''}` : '-'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
