import React from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { ReflexMode } from '../../types';

export interface CompactModuleCardProps {
  id: ReflexMode;
  title: string;
  categoryTag: string;
  categoryTagColor: string;
  shortDescription: string;
  icon: React.ReactNode;
  iconBg: string;
  accentHover: string;
  unit: string;
  formattedScore?: string | null;
  tierName?: string | null;
  tierRank?: number | null;
  isRecordMode?: boolean;
  onClick: () => void;
}

export const CompactModuleCard: React.FC<CompactModuleCardProps> = ({
  id,
  title,
  categoryTag,
  categoryTagColor,
  shortDescription,
  icon,
  iconBg,
  accentHover,
  formattedScore,
  tierName,
  isRecordMode,
  onClick,
}) => {
  return (
    <div
      id={`compact-card-${id}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full h-[68px] sm:h-[72px] px-3 sm:px-3.5 rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 ${accentHover} shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 select-none active:scale-[0.985]`}
    >
      {/* 1. Left: Soft Pastel Icon Box */}
      <div className={`w-11 h-11 sm:w-11.5 sm:h-11.5 rounded-2xl ${iconBg} border flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
        {icon}
      </div>

      {/* 2. Middle: Title + 1-Line Subtitle (Without Category Tag for Maximum Width) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Top Line: Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate tracking-tight">
          {title}
        </h3>

        {/* Bottom Line: 1-Line Description or Record Summary */}
        <p className="text-[11px] sm:text-xs text-slate-400 group-hover:text-slate-500 transition-colors truncate mt-0.5 font-normal">
          {shortDescription}
        </p>
      </div>

      {/* 3. Right: Best Record Indicator & Circular Action Trigger */}
      <div className="flex items-center gap-2 shrink-0">
        {formattedScore && (
          <div className="hidden xs:flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-200/70 text-[11px] font-mono font-bold text-slate-700">
            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate max-w-[80px]">{formattedScore}</span>
            {tierName && (
              <span className="text-[9px] font-sans font-semibold text-slate-400 hidden md:inline">
                • {tierName}
              </span>
            )}
          </div>
        )}

        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 border border-slate-200/60 group-hover:border-indigo-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all shrink-0">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
