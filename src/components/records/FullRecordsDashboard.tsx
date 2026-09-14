import React, { useState } from 'react';
import { ReflexMode, BestRecords } from '../../types';
import {
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import {
  MODE_SUBMODES_MAP,
  getBestRecord,
  clearAllReflexData,
} from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { TierBadge } from '../common/TierBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { playButtonPress } from '../../utils/audio';

export type FilterCategory = 'all' | 'reflex' | 'memory' | 'focus';

export interface ModeMetaItem {
  id: ReflexMode;
  title: string;
  category: 'reflex' | 'memory' | 'focus';
  categoryTag: string;
  categoryTagColor: string;
  shortDescription: string;
  icon: React.ReactNode;
  iconBg: string;
  accentHover: string;
  unit: string;
}

interface FullRecordsDashboardProps {
  records: BestRecords;
  modes: ModeMetaItem[];
  activeCategory: FilterCategory;
  onSelectCategory: (cat: FilterCategory) => void;
  onSelectMode: (mode: ReflexMode) => void;
  onOpenRecordModal: (mode: ReflexMode, title: string, unit: string, subMode?: string) => void;
  onRecordsUpdated: () => void;
}

export const FullRecordsDashboard: React.FC<FullRecordsDashboardProps> = ({
  modes,
  activeCategory,
  onSelectCategory,
  onOpenRecordModal,
  onRecordsUpdated,
}) => {
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Format score display compactly
  const formatScore = (score: number | null | undefined, unit: string, mode: ReflexMode): string => {
    if (score === null || score === undefined) return '-';
    if (mode === 'matrix') return `${score.toFixed(2)}s`;
    if (mode === 'nback') return `${Math.round(score)}%`;
    if (mode === 'motor') return `${score} Hits`;
    if (mode === 'digit_span') return `${score} Digit`;
    if (mode === 'memory' || mode === 'color_memory' || mode === 'tracking' || mode === 'chromatic') return `LVL ${score}`;
    if (mode === 'switching' || mode === 'temporal') return `${Math.round(score)} ms`;
    if (mode === 'flanker') return `${Math.round(score)} Poin`;
    return `${score} ${unit}`;
  };

  // Filter modes according to active category
  const filteredModes = modes.filter((m) => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  const handleClearAll = () => {
    playButtonPress();
    clearAllReflexData();
    setShowClearAllConfirm(false);
    onRecordsUpdated();
  };

  return (
    <div className="w-full flex flex-col gap-3 pb-6">
      {/* 1. Category Filter Bar + Subtle Reset Action (Single Level, Open & Clean) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => {
              playButtonPress();
              onSelectCategory('all');
            }}
            className={`px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            Semua (19)
          </button>
          <button
            type="button"
            onClick={() => {
              playButtonPress();
              onSelectCategory('reflex');
            }}
            className={`px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeCategory === 'reflex'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            Refleks (6)
          </button>
          <button
            type="button"
            onClick={() => {
              playButtonPress();
              onSelectCategory('memory');
            }}
            className={`px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeCategory === 'memory'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            Memori (6)
          </button>
          <button
            type="button"
            onClick={() => {
              playButtonPress();
              onSelectCategory('focus');
            }}
            className={`px-3 py-1 sm:px-3.5 sm:py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
              activeCategory === 'focus'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
            }`}
          >
            Fokus & Pola (7)
          </button>
        </div>

        {/* Subtle, Low-Profile Reset Button (No loud red borders/backgrounds) */}
        <button
          id="btn-reset-all-records-subtle"
          type="button"
          onClick={() => {
            playButtonPress();
            setShowClearAllConfirm(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors cursor-pointer select-none whitespace-nowrap shrink-0"
          title="Reset semua catatan rekor dan riwayat pengujian"
        >
          <RotateCcw className="w-3 h-3 shrink-0" />
          <span className="hidden xs:inline sm:inline">Reset Data</span>
        </button>
      </div>

      {/* 2. High-Density, Data-First Records List (Whole Card is Clickable Trigger) */}
      <div className="flex flex-col gap-2.5">
        {filteredModes.map((mode) => {
          const subModes = MODE_SUBMODES_MAP[mode.id];
          const hasSubModes = subModes && subModes.length > 0;

          if (hasSubModes) {
            // Multi-submode group card (Matrix, N-Back, Audio) - Ultra compact & clean without category tag
            return (
              <div
                key={mode.id}
                className="w-full rounded-xl bg-white/95 border border-slate-200/80 shadow-2xs overflow-hidden"
              >
                {/* Compact Mode Header (No category tag, no description, maximum title room) */}
                <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${mode.iconBg}`}>
                      {React.isValidElement(mode.icon)
                        ? React.cloneElement(mode.icon as React.ReactElement<{ className?: string }>, {
                            className: 'w-3.5 h-3.5',
                          })
                        : mode.icon}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {mode.title}
                    </span>
                  </div>
                </div>

                {/* Sub-mode Clickable Rows (Entire row opens record history) */}
                <div className="divide-y divide-slate-100">
                  {subModes.map((sm) => {
                    const score = getBestRecord(mode.id, sm.id);
                    const hasScore = score !== null && score !== undefined;
                    const tierEval = hasScore ? evaluateScoreTier(mode.id, score, sm.id) : null;
                    const formattedScore = formatScore(score, mode.unit, mode.id);

                    return (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => {
                          playButtonPress();
                          onOpenRecordModal(
                            mode.id,
                            `${mode.title} - ${sm.shortLabel || sm.label}`,
                            mode.unit,
                            sm.id
                          );
                        }}
                        className="w-full px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors cursor-pointer select-none group"
                        title={`Klik untuk melihat riwayat rekor ${sm.label}`}
                      >
                        {/* Left: Sub-mode Label */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {sm.label}
                          </span>
                        </div>

                        {/* Right: Score + TierBadge + Chevron */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                          <span className="text-xs sm:text-sm font-black text-slate-900 font-mono text-right min-w-[60px]">
                            {formattedScore}
                          </span>

                          <div className="min-w-[90px] flex justify-end">
                            {tierEval ? (
                              <TierBadge
                                rank={tierEval.rank}
                                label={tierEval.tierName}
                                size="xs"
                              />
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                                Belum Diuji
                              </span>
                            )}
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Single Mode Row Card: 2-Row Layout (Title Top, Score/Tier Bottom-Right)
          // No Category Tag, Spacious & 100% Anti-Truncation
          const score = getBestRecord(mode.id);
          const hasScore = score !== null && score !== undefined;
          const tierEval = hasScore ? evaluateScoreTier(mode.id, score) : null;
          const formattedScore = formatScore(score, mode.unit, mode.id);

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                playButtonPress();
                onOpenRecordModal(mode.id, mode.title, mode.unit);
              }}
              className="w-full rounded-xl bg-white/95 border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 flex flex-col gap-2 hover:border-slate-300 hover:bg-slate-50/70 active:bg-slate-100/70 transition-all cursor-pointer select-none group text-left"
              title={`Klik untuk melihat riwayat rekor ${mode.title}`}
            >
              {/* Row 1 (Top): Icon + Full Mode Title + Chevron (Right) */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border shrink-0 ${mode.iconBg}`}>
                    {React.isValidElement(mode.icon)
                      ? React.cloneElement(mode.icon as React.ReactElement<{ className?: string }>, {
                          className: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
                        })
                      : mode.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {mode.title}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>

              {/* Row 2 (Bottom): Spacious Left, Record & Tier Right-Aligned */}
              <div className="flex items-center justify-end gap-3 w-full pt-1.5 border-t border-slate-100/80">
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono text-right">
                  {formattedScore}
                </span>

                <div className="min-w-[85px] flex justify-end">
                  {tierEval ? (
                    <TierBadge
                      rank={tierEval.rank}
                      label={tierEval.tierName}
                      size="xs"
                    />
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                      Belum Diuji
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirmation Dialog for Resetting All Data (Double check safety) */}
      <ConfirmDialog
        isOpen={showClearAllConfirm}
        title="Reset Seluruh Rekor & Riwayat?"
        message="Tindakan ini akan menghapus semua catatan skor terbaik, lencana tier, dan log riwayat pengujian di seluruh modul dan varian sub-mode secara permanen."
        confirmLabel="Ya, Hapus Semua"
        cancelLabel="Batal"
        danger={true}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearAllConfirm(false)}
      />
    </div>
  );
};
