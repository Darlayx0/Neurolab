import React from 'react';
import { ArrowLeft, BookOpen, Trophy, RotateCcw } from 'lucide-react';

interface InGameHUDProps {
  title: string;
  modeIcon?: React.ReactNode;
  isGameActive?: boolean;
  onExit: () => void;
  onRestart?: () => void;
  onOpenGuide?: () => void;
  onOpenRecord?: () => void;
  onOpenTierStandards?: () => void;
}

export const InGameHUD: React.FC<InGameHUDProps> = ({
  title,
  modeIcon,
  isGameActive = false,
  onExit,
  onRestart,
  onOpenGuide,
  onOpenRecord,
  onOpenTierStandards,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 w-full px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 select-none z-30 pointer-events-none bg-transparent transition-colors duration-200">
      {/* Left: Back Button (Directly back to main menu) */}
      <div className="flex items-center gap-3 min-w-0 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExit();
          }}
          aria-label="Kembali ke Menu Utama"
          title="Kembali ke Menu Utama"
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 hover:border-slate-300 shadow-2xs hover:shadow-xs backdrop-blur-md transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Center: In Active Game State -> Centered Mode Title with clean glass capsule */}
      {isGameActive && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center max-w-[55%] sm:max-w-[65%] px-2 z-10">
          <div className="px-3.5 py-1 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight select-none truncate text-center">
              {title}
            </h2>
          </div>
        </div>
      )}

      {/* Right Side: Active Game -> Restart button; Preparation -> Info & Record buttons */}
      {isGameActive ? (
        <div className="flex items-center gap-2 shrink-0 z-10 pointer-events-auto">
          {onRestart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestart();
              }}
              aria-label="Ulangi ke Persiapan"
              title="Ulangi ke Persiapan"
              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-rose-50/90 text-slate-700 hover:text-rose-600 border border-slate-200/70 hover:border-rose-200 shadow-2xs hover:shadow-xs backdrop-blur-md transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 z-10 pointer-events-auto">
          {/* Panduan & Standar Terpadu (Soft Glass Circle) */}
          {(onOpenGuide || onOpenTierStandards) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenGuide) onOpenGuide();
                else if (onOpenTierStandards) onOpenTierStandards();
              }}
              aria-label="Panduan & Standar Tier"
              title="Panduan & Standar"
              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-indigo-50/90 text-slate-600 hover:text-indigo-600 border border-slate-200/70 hover:border-indigo-200 shadow-2xs hover:shadow-xs backdrop-blur-md transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}

          {/* Rekor Mode Ini (Soft Glass Circle) */}
          {onOpenRecord && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRecord();
              }}
              aria-label="Rekor Pribadi"
              title="Rekor Pribadi"
              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 hover:bg-amber-50/90 text-slate-600 hover:text-amber-600 border border-slate-200/70 hover:border-amber-200 shadow-2xs hover:shadow-xs backdrop-blur-md transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
