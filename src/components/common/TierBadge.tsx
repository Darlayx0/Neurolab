import React from 'react';
import { Crown, Trophy, Gem, Medal, Award, Shield } from 'lucide-react';
import { ReflexMode, TierRank } from '../../types';
import { TIER_METADATA, evaluateScoreTier, formatModeScore } from '../../utils/tierSystem';

export interface TierIconProps {
  rank: TierRank | null | undefined;
  className?: string;
}

export const TierIcon: React.FC<TierIconProps> = ({ rank, className = 'w-4 h-4' }) => {
  if (!rank) {
    return <Shield className={className} />;
  }

  switch (rank) {
    case 1:
      return <Crown className={`${className} fill-amber-400 text-amber-400`} />;
    case 2:
      return <Trophy className={className} />;
    case 3:
      return <Gem className={className} />;
    case 4:
      return <Medal className={className} />;
    case 5:
      return <Award className={className} />;
    case 6:
    default:
      return <Shield className={className} />;
  }
};

export interface TierBadgeProps {
  rank: TierRank | null | undefined;
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  rank,
  label,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  if (!rank) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-slate-100 border border-slate-200 text-slate-500 ${
          size === 'xs'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'sm'
            ? 'px-2.5 py-0.5 text-xs'
            : size === 'md'
            ? 'px-3 py-1 text-xs'
            : 'px-3.5 py-1.5 text-sm'
        } ${className}`}
      >
        {showIcon && <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span>{label || 'Unranked'}</span>
      </span>
    );
  }

  const meta = TIER_METADATA[rank];
  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'sm'
      ? 'px-2.5 py-0.5 text-xs'
      : size === 'md'
      ? 'px-3 py-1 text-xs'
      : 'px-3.5 py-1.5 text-sm';

  const iconSizes =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'md'
      ? 'w-4 h-4'
      : 'w-4.5 h-4.5';

  if (rank === 1) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-black tracking-wide bg-slate-950 text-amber-300 border border-amber-400/80 shadow-xs shadow-amber-500/25 ring-1 ring-amber-400/30 ${sizeClasses} ${className}`}
      >
        {showIcon && (
          <Crown className={`${iconSizes} fill-amber-400 text-amber-400 shrink-0`} />
        )}
        <span className="truncate text-amber-300 drop-shadow-xs">{label || meta.name}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${meta.badgeBg} ${meta.badgeBorder} ${meta.textColor} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <span className={`${meta.iconColor} shrink-0`}>
          <TierIcon rank={rank} className={iconSizes} />
        </span>
      )}
      <span className="truncate">{label || meta.name}</span>
    </span>
  );
};

export interface ModePreparationFooterProps {
  mode: ReflexMode;
  bestRecord: number | null | undefined;
  unit: string;
  subModeLabel?: string;
  subModeId?: string;
  onOpenStandards?: () => void;
  onOpenRecord?: () => void;
}

export const ModePreparationFooter: React.FC<ModePreparationFooterProps> = ({
  mode,
  bestRecord,
  unit,
  subModeLabel,
  subModeId,
  onOpenStandards,
  onOpenRecord,
}) => {
  const hasRecord = bestRecord !== null && bestRecord !== undefined;
  const tierInfo = hasRecord ? evaluateScoreTier(mode, bestRecord, subModeId) : null;
  const formattedScore = formatModeScore(mode, bestRecord, unit);

  return (
    <footer className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md mx-auto rounded-2xl bg-white/85 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm py-2 px-3.5 sm:px-4 flex items-center justify-between gap-2.5 transition-all">
        {/* Left Side: Trophy Icon + Contextual Label */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 text-amber-500">
            <Trophy className="w-3 h-3" />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate tracking-tight">
            Rekor Terbaik{subModeLabel ? ` (${subModeLabel})` : ''}
          </span>
        </div>

        {/* Right Side: Score & Tier Badge / Empty Status */}
        {hasRecord && tierInfo && tierInfo.rank ? (
          <div className="flex items-center gap-2 shrink-0">
            {tierInfo.rank === 1 ? (
              <button
                type="button"
                onClick={onOpenStandards}
                title={`Standar Tier: ${tierInfo.tierName} (${tierInfo.percentile}) - Klik untuk info`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 border border-amber-400/80 shadow-xs shadow-amber-500/25 text-xs font-black transition-all cursor-pointer select-none hover:brightness-110 active:scale-98 ring-1 ring-amber-400/30"
              >
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-black text-amber-300 tracking-wide uppercase text-[10px]">{tierInfo.tierName}</span>
                <span className="text-amber-400/50 font-normal">•</span>
                <span className="font-mono font-black text-white text-xs">{formattedScore}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStandards}
                title={`Standar Tier: ${tierInfo.tierName} (${tierInfo.percentile}) - Klik untuk info`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${tierInfo.badgeBg} ${tierInfo.badgeBorder} ${tierInfo.textColor} hover:brightness-95 active:scale-98`}
              >
                <span className={`${tierInfo.colorClass} shrink-0`}>
                  <TierIcon rank={tierInfo.rank} className="w-3.5 h-3.5" />
                </span>
                <span className="font-black text-[11px]">{tierInfo.tierName}</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="font-mono font-black text-slate-900 text-xs">{formattedScore}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-500 border border-slate-200/70 text-[11px] font-semibold shrink-0">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Belum Ada Rekor</span>
          </div>
        )}
      </div>
    </footer>
  );
};
