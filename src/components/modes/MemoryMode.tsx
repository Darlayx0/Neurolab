import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MemoryCard } from '../../types';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getMemoryEvaluation, saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { RotateCcw, Play, CheckCircle2, AlertOctagon, Brain, Sparkles, Eye } from 'lucide-react';

interface MemoryModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type MemoryPhase = 'idle' | 'memorize' | 'recall' | 'level_cleared' | 'game_over';

const GRID_SIZE = 16; // 4x4 Grid

export const MemoryMode: React.FC<MemoryModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [level, setLevel] = useState<number>(1);
  const [phase, setPhase] = useState<MemoryPhase>('idle');
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [expectedNumber, setExpectedNumber] = useState<number>(1);
  const [targetCount, setTargetCount] = useState<number>(3);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const generateLevelCards = useCallback((currentLvl: number) => {
    const count = Math.min(12, 2 + currentLvl);
    setTargetCount(count);
    setExpectedNumber(1);

    const indices: number[] = [];
    while (indices.length < count) {
      const rand = Math.floor(Math.random() * GRID_SIZE);
      if (!indices.includes(rand)) {
        indices.push(rand);
      }
    }

    const newCards: MemoryCard[] = Array.from({ length: GRID_SIZE }, (_, i) => {
      const foundIdx = indices.indexOf(i);
      return {
        id: i,
        value: foundIdx !== -1 ? foundIdx + 1 : 0,
        isRevealed: false,
        isMatched: false,
      };
    });

    setCards(newCards);
    setPhase('memorize');

    // Memorize window: 1.8 seconds
    timerRef.current = setTimeout(() => {
      setPhase('recall');
    }, 1800);
  }, []);

  const startNewGame = () => {
    clearTimer();
    playTactileClick();
    setLevel(1);
    generateLevelCards(1);
  };

  const handleCardClick = (card: MemoryCard) => {
    if (phase !== 'recall') return;
    if (card.value === 0 || card.isMatched) return;

    if (card.value === expectedNumber) {
      playTactileClick();
      const updated = cards.map((c) =>
        c.id === card.id ? { ...c, isMatched: true } : c
      );
      setCards(updated);

      if (expectedNumber >= targetCount) {
        playSuccessChime();
        setPhase('level_cleared');

        const nextLvl = level + 1;
        timerRef.current = setTimeout(() => {
          setLevel(nextLvl);
          generateLevelCards(nextLvl);
        }, 1200);
      } else {
        setExpectedNumber((prev) => prev + 1);
      }
    } else {
      // Wrong card -> Game Over
      clearTimer();
      playErrorBuzz();
      setPhase('game_over');

      const maxLevelAchieved = Math.max(1, level - 1);
      saveBestRecord('memory', maxLevelAchieved);
      const evalData = getMemoryEvaluation(maxLevelAchieved);

      addHistoryItem({
        mode: 'memory',
        primaryMetric: maxLevelAchieved,
        unit: 'Level',
        ratingLabel: evalData.tier,
        subMetric: `Gagal di Level ${level} (Target Angka: ${expectedNumber})`,
      });
      onRecordUpdated();
    }
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startNewGame();
  };

  const handleRestartToPreparation = () => {
    clearTimer();
    setIsCountdownOpen(false);
    setLevel(1);
    setCards([]);
    setExpectedNumber(1);
    setPhase('idle');
  };

  const handleExitDirectly = () => {
    clearTimer();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Header - hidden when game_over */}
      {phase !== 'game_over' && (
        <InGameHUD
          title="Memori Spasial"
          modeIcon={<Brain className="w-4 h-4 text-emerald-500" />}
          isGameActive={phase !== 'idle' || isCountdownOpen}
          onExit={handleExitDirectly}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Main Arena (Edge-to-edge from top to bottom) */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Phase: IDLE - Essential Guide Only */}
        {phase === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600 shadow-xs">
              <Brain className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Memori Spasial
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Hafalkan posisi angka selama <strong className="text-slate-900 font-bold">1.8 detik</strong>, lalu ketuk kotak secara berurutan mulai dari angka terkecil <strong className="text-emerald-600 font-bold">1 ke terbesar</strong>.
            </p>

            <AppButton
              id="start-memory-test-button"
              label="MULAI TANTANGAN"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={() => setIsCountdownOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </div>
        )}

        {/* Active Game Phase: Open Stage, Sleek Spatial Tiles, De-boxed Layout */}
        {(phase === 'memorize' || phase === 'recall' || phase === 'level_cleared') && (
          <div className="max-w-sm sm:max-w-md w-full flex flex-col items-center gap-3 sm:gap-4 relative z-10 animate-in fade-in duration-150">
            {/* Minimalist Top Context & Status Bar (Replaces In-Game Footer) */}
            <div className="w-full flex flex-col gap-2">
              <div className="w-full flex items-center justify-between px-1 text-xs">
                {/* Level & Target Box Count Indicator */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                    <span>Level {level}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-400">{targetCount} Kotak</span>
                  </div>
                </div>

                {/* Right Side: Best Record & Phase Status Badge */}
                <div className="flex items-center gap-2">
                  {bestRecord !== null && (
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      Rekor: <strong className="text-slate-800 font-bold">Level {bestRecord}</strong>
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border transition-all ${
                      phase === 'memorize'
                        ? 'bg-amber-50 text-amber-900 border-amber-300/80'
                        : phase === 'level_cleared'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300/80 animate-in zoom-in-95 duration-150'
                        : 'bg-indigo-50 text-indigo-900 border-indigo-300/80'
                    }`}
                  >
                    {phase === 'memorize' ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                        <span>Hafalkan Posisi!</span>
                      </>
                    ) : phase === 'level_cleared' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Level Selesai!</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span>Urutkan: <strong>{expectedNumber}</strong> / {targetCount}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Micro Progress Bar towards Level Completion */}
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                  style={{
                    width: `${
                      phase === 'level_cleared'
                        ? 100
                        : phase === 'memorize'
                        ? 0
                        : ((expectedNumber - 1) / targetCount) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 4x4 Spatial Matrix Stage - Open Stage, De-boxed Architectural Tiles */}
            <div className="grid grid-cols-4 grid-rows-4 gap-2.5 sm:gap-3 w-full aspect-square">
              {cards.map((card) => {
                const hasValue = card.value > 0;
                const showNumber =
                  hasValue && (phase === 'memorize' || card.isMatched || phase === 'game_over');
                const isTargetAndHidden =
                  hasValue && phase === 'recall' && !card.isMatched;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardClick(card)}
                    disabled={phase !== 'recall' || card.isMatched || !hasValue}
                    className={`rounded-2xl transition-all duration-150 flex items-center justify-center font-mono font-black text-xl sm:text-2xl select-none relative ${
                      card.isMatched
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs scale-[0.98]'
                        : showNumber
                        ? 'bg-slate-900 text-white border border-slate-800 shadow-sm'
                        : isTargetAndHidden
                        ? 'bg-white hover:bg-indigo-50/40 text-slate-800 border border-slate-200 hover:border-indigo-300 shadow-xs active:scale-[0.96] active:bg-indigo-100 cursor-pointer'
                        : 'bg-slate-100/50 border border-slate-200/60 cursor-default opacity-80'
                    }`}
                  >
                    {showNumber ? card.value : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase: GAME OVER */}
        {phase === 'game_over' && (
          (() => {
            const finalScore = Math.max(1, level - 1);
            const tierEval = evaluateScoreTier('memory', finalScore);
            const isNewRec = bestRecord !== null ? finalScore > bestRecord : false;
            return (
              <GameResultView
                modeTitle="Memori Spasial"
                subModeLabel="Urutan Angka Spasial (Matrix 4x4)"
                primaryScore={finalScore}
                scoreUnit="Level"
                isNewRecord={isNewRec}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Memori Spasial'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'level',
                    label: 'Level Tertinggi Tercapai',
                    value: `Level ${finalScore}`,
                    highlight: true,
                  },
                  {
                    id: 'targets',
                    label: 'Kapasitas Memori',
                    value: `${finalScore + 2} Kotak Simultan`,
                  },
                  {
                    id: 'retention',
                    label: 'Durasi Menghafal',
                    value: '1.8 Detik',
                  },
                ]}
                onBackToMenu={onBackToMenu}
                onRetry={handleRestartToPreparation}
              />
            );
          })()
        )}
      </main>

      {/* Bottom Preparation Footer (Shown ONLY in IDLE state) */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="memory"
          bestRecord={bestRecord}
          unit="Level"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Memori Spasial"
        accentColor="indigo"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="memory"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="memory"
        modeTitle="Memori Spasial"
        unit="Level"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
