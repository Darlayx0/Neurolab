import React from 'react';
import { Sparkles, RotateCcw, ArrowLeft } from 'lucide-react';
import { TierRank } from '../../types';
import { TierBadge, TierIcon } from './TierBadge';
import { AppButton } from './AppButton';
import { TIER_METADATA } from '../../utils/tierSystem';

export interface GameResultStat {
  id: string;
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface GameResultViewProps {
  modeTitle: string;
  subModeLabel?: string;
  primaryScore: string | number;
  scoreUnit?: string;
  isNewRecord?: boolean;
  tierRank?: TierRank | number | null;
  tierName?: string;
  tierCaption?: string;
  tierDescription?: string;
  stats: GameResultStat[];
  onBackToMenu: () => void;
  onRetry: () => void;
  retryLabel?: string;
}

export const GameResultView: React.FC<GameResultViewProps> = ({
  modeTitle,
  subModeLabel,
  primaryScore,
  scoreUnit,
  isNewRecord = false,
  tierRank,
  tierName,
  tierCaption,
  tierDescription,
  stats,
  onBackToMenu,
  onRetry,
  retryLabel = 'Kembali ke Persiapan',
}) => {
  const validRank = tierRank && tierRank >= 1 && tierRank <= 6 ? (tierRank as TierRank) : null;
  const meta = validRank ? TIER_METADATA[validRank] : null;
  const displayName = tierName || (meta ? meta.name : null);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 sm:py-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* 1. Label Hasil */}
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
        HASIL
      </span>

      {/* 2. Nama Game Mode & Sub Mode */}
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        {modeTitle}
      </h2>
      {subModeLabel && (
        <span className="text-xs font-semibold text-slate-500 mt-0.5 tracking-wide">
          {subModeLabel}
        </span>
      )}

      {/* 3. Skor Utama & Label Rekor Baru */}
      <div className="flex flex-col items-center my-3">
        <div className="font-mono font-black text-5xl sm:text-6xl text-slate-950 tracking-tight">
          {primaryScore}
          {scoreUnit && <span className="text-3xl sm:text-4xl text-slate-600 font-bold ml-1">{scoreUnit}</span>}
        </div>

        {isNewRecord && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-amber-50 border border-amber-300/80 text-amber-800 text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Rekor Baru!</span>
          </div>
        )}
      </div>

      {/* 4. Lencana (Ikon + Nama), Caption, & Keterangan */}
      {(validRank || displayName) && (
        <div className="flex flex-col items-center mt-2 mb-4 w-full max-w-sm">
          {/* Lencana (Ikon + Nama) */}
          <div className="flex items-center justify-center">
            {validRank ? (
              <TierBadge rank={validRank} size="md" label={displayName || undefined} />
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs bg-slate-100 border border-slate-200 text-slate-700">
                <TierIcon rank={null} className="w-3.5 h-3.5" />
                <span>{displayName}</span>
              </span>
            )}
          </div>

          {/* Caption Peringkat */}
          {tierCaption && (
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 mt-2.5 tracking-tight">
              {tierCaption}
            </h3>
          )}

          {/* Keterangan Lencana */}
          {tierDescription && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xs font-normal">
              {tierDescription}
            </p>
          )}
        </div>
      )}

      {/* 5. Statistik Lengkap Gameplay (Garis Pembatas Modern) */}
      {stats && stats.length > 0 && (
        <div className="w-full my-4 border-y border-slate-200/90 divide-y divide-slate-100 py-1">
          {stats.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2.5 px-1 text-xs"
            >
              <span className="font-medium text-slate-500 text-left">
                {item.label}
              </span>
              <span
                className={`font-mono font-bold text-right ${
                  item.highlight ? 'text-amber-700 font-black' : 'text-slate-900'
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 6. Tombol Aksi Vertikal: Menu Kembali di Atas, Coba Lagi di Bawah */}
      <div className="flex flex-col gap-2.5 w-full mt-2">
        <AppButton
          id="btn-result-back"
          label="Menu Utama"
          icon={<ArrowLeft className="w-4 h-4" />}
          iconPosition="leading"
          variant="secondary"
          onClick={onBackToMenu}
          className="w-full py-3.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-98 transition-all"
        />

        <AppButton
          id="btn-result-retry"
          label={retryLabel}
          icon={<RotateCcw className="w-4 h-4" />}
          iconPosition="leading"
          variant="primary"
          onClick={onRetry}
          className="w-full py-3.5 text-xs font-black rounded-xl bg-slate-950 text-white hover:bg-slate-800 active:scale-98 shadow-sm transition-all"
        />
      </div>
    </div>
  );
};
