import React from 'react';
import { ReflexMode, HistoryItem } from '../../types';
import { X, Trophy, Trash2, Calendar, Shield, Crown } from 'lucide-react';
import {
  clearModeHistory,
  getStoredHistory,
  getStoredRecords,
  getBestRecord,
  MODE_SUBMODES_MAP,
} from '../../utils/storage';
import { evaluateScoreTier, TIER_METADATA } from '../../utils/tierSystem';
import { TierIcon, TierBadge } from './TierBadge';
import { AppButton } from './AppButton';
import { ConfirmDialog } from './ConfirmDialog';

interface ModeRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ReflexMode;
  modeTitle: string;
  unit: string;
  initialSubMode?: string;
  onRecordCleared?: () => void;
}

export const ModeRecordModal: React.FC<ModeRecordModalProps> = ({
  isOpen,
  onClose,
  mode,
  modeTitle,
  unit,
  initialSubMode,
  onRecordCleared,
}) => {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [historyItems, setHistoryItems] = React.useState<HistoryItem[]>([]);
  const subModes = MODE_SUBMODES_MAP[mode] || [];
  const hasSubModes = subModes.length > 0;

  const [selectedSubMode, setSelectedSubMode] = React.useState<string>(
    initialSubMode || (hasSubModes ? subModes[0].id : 'all')
  );

  React.useEffect(() => {
    if (initialSubMode) {
      setSelectedSubMode(initialSubMode);
    } else if (hasSubModes) {
      setSelectedSubMode(subModes[0].id);
    } else {
      setSelectedSubMode('all');
    }
  }, [initialSubMode, hasSubModes, mode]);

  const loadData = React.useCallback(() => {
    const allHistory = getStoredHistory();
    const modeHistory = allHistory.filter((item) => item.mode === mode);
    setHistoryItems(modeHistory);
  }, [mode]);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const activeSubModeDef = subModes.find((s) => s.id === selectedSubMode);
  const activeLabel = activeSubModeDef ? activeSubModeDef.shortLabel : 'Semua Variasi';

  // Compute best score based on selected submode
  const bestScore = selectedSubMode === 'all'
    ? getStoredRecords()[mode]
    : getBestRecord(mode, selectedSubMode);

  const filteredHistory = !hasSubModes || selectedSubMode === 'all'
    ? historyItems
    : historyItems.filter((item) => item.subMode === selectedSubMode);

  const handleClearHistory = () => {
    clearModeHistory(mode, selectedSubMode === 'all' ? undefined : selectedSubMode);
    setShowClearConfirm(false);
    loadData();
    if (onRecordCleared) {
      onRecordCleared();
    }
  };

  const formattedBest =
    bestScore !== null && bestScore !== undefined
      ? mode === 'matrix'
        ? `${bestScore.toFixed(2)} ${unit}`
        : mode === 'tracking' || mode === 'memory' || mode === 'chromatic'
        ? `Level ${bestScore}`
        : mode === 'nback'
        ? `${Math.round(bestScore)}%`
        : `${bestScore} ${unit}`
      : 'Belum Ada';

  // Evaluate Tier for bestScore
  const bestTier = bestScore !== null && bestScore !== undefined
    ? evaluateScoreTier(mode, bestScore, selectedSubMode === 'all' ? undefined : selectedSubMode)
    : null;

  const bestTierMeta = bestTier?.rank ? TIER_METADATA[bestTier.rank] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 select-none text-slate-900"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                Rekor Pribadi
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Rekor"
            title="Tutup"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-mode Segmented Tabs (if mode has sub-modes) */}
        {hasSubModes && (
          <div className="pt-3 shrink-0">
            <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1 overflow-x-auto">
              {subModes.map((sm) => (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => setSelectedSubMode(sm.id)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                    selectedSubMode === sm.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {sm.shortLabel}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedSubMode('all')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                  selectedSubMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semua
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Top Stat Card: Best Record with Lucide Tier Icon & Badge */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              bestTier?.rank === 1
                ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 border-amber-300 shadow-sm ring-1 ring-amber-400/30'
                : bestTierMeta
                ? `${bestTierMeta.badgeBg} ${bestTierMeta.badgeBorder}`
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pencapaian Terbaik ({activeLabel})
                </span>
                {bestTier && bestTier.rank && (
                  bestTier.rank === 1 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-amber-300 border border-amber-400/70 shadow-xs shadow-amber-500/25 ring-1 ring-amber-400/30">
                      <Crown className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                      <span>Tier 1: APEX</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${bestTier.badgeBg} ${bestTier.badgeBorder} ${bestTier.textColor}`}
                    >
                      <TierIcon rank={bestTier.rank} className="w-3 h-3" />
                      <span>Tier {bestTier.rank}: {bestTier.tierName}</span>
                    </span>
                  )
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {formattedBest}
              </div>
              {bestTier && bestTier.rank && (
                <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                  <span className="font-bold text-slate-900">{bestTier.percentile}</span> • {bestTier.desc}
                </p>
              )}
            </div>

            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                bestTier?.rank === 1
                  ? 'bg-slate-950 border-amber-400/70 text-amber-400 shadow-md shadow-amber-500/25 ring-1 ring-amber-400/30'
                  : bestTierMeta
                  ? `${bestTierMeta.badgeBg} ${bestTierMeta.badgeBorder} ${bestTierMeta.iconColor}`
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {bestTier && bestTier.rank ? (
                bestTier.rank === 1 ? (
                  <Crown className="w-6 h-6 fill-amber-400 text-amber-400" />
                ) : (
                  <TierIcon rank={bestTier.rank} className="w-6 h-6" />
                )
              ) : (
                <Shield className="w-6 h-6" />
              )}
            </div>
          </div>

          {/* History List Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Riwayat Sesi {hasSubModes ? `(${activeLabel})` : ''} • {filteredHistory.length}
              </span>
              {filteredHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {hasSubModes && selectedSubMode !== 'all' ? activeLabel : 'Riwayat'}</span>
                </button>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 mb-0.5">Belum Ada Riwayat Sesi</p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Selesaikan pengujian pada konfigurasi ini untuk menyimpan statistik performa dan evaluasi tier.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((item) => {
                  const itemTier = evaluateScoreTier(mode, item.primaryMetric, item.subMode);
                  const itemMeta = itemTier.rank ? TIER_METADATA[itemTier.rank] : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {item.primaryMetric} {item.unit}
                          </span>

                          {/* Lucide Tier Badge */}
                          {itemTier.rank && (
                            <TierBadge rank={itemTier.rank} size="xs" />
                          )}

                          {item.subModeLabel && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-800">
                              {item.subModeLabel}
                            </span>
                          )}
                        </div>
                        {item.subMetric && (
                          <p className="text-[11px] text-slate-500 truncate">{item.subMetric}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
          <AppButton
            id="close-mode-record-button"
            label="Tutup"
            variant="secondary"
            onClick={onClose}
            className="text-xs px-5 py-2 min-h-[38px] rounded-xl"
          />
        </div>
      </div>

      {/* Confirmation Dialog on Reset History */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title={`Hapus Riwayat ${hasSubModes && selectedSubMode !== 'all' ? `${modeTitle} (${activeLabel})` : modeTitle}?`}
        message={
          hasSubModes && selectedSubMode !== 'all'
            ? `Catatan riwayat sesi dan rekor terbaik untuk variasi ${activeLabel} akan dihapus permanen dari perangkat.`
            : `Semua catatan riwayat sesi dan rekor terbaik untuk mode ini akan dihapus permanen dari perangkat.`
        }
        confirmLabel="Ya, Hapus Riwayat"
        cancelLabel="Batal"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
        danger={true}
      />
    </div>
  );
};
