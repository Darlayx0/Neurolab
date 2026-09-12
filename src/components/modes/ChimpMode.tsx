import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChimpTile, ChimpPhase } from '../../types';
import {
  playChimpTap,
  playChimpStrike,
  playLevelClearFanfare,
  playTactileClick,
  playButtonPress,
} from '../../utils/audio';
import { saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import {
  Brain,
  Sparkles,
  Heart,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
} from 'lucide-react';

interface ChimpModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

// 5 Columns x 8 Rows = 40 Cells (Adaptive on mobile & desktop)
const TOTAL_COLUMNS = 5;
const TOTAL_ROWS = 8;
const TOTAL_CELLS = TOTAL_COLUMNS * TOTAL_ROWS;
const INITIAL_NUMBER_COUNT = 4;
const MAX_LIVES = 3;

export const ChimpMode: React.FC<ChimpModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  // Game Lifecycle States
  const [phase, setPhase] = useState<ChimpPhase>('idle');
  const [level, setLevel] = useState<number>(1);
  const [numberCount, setNumberCount] = useState<number>(INITIAL_NUMBER_COUNT);
  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [tiles, setTiles] = useState<ChimpTile[]>([]);
  const [expectedNumber, setExpectedNumber] = useState<number>(1);
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [showMistakeFlash, setShowMistakeFlash] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Statistics Tracking
  const [maxCompletedNumbers, setMaxCompletedNumbers] = useState<number>(0);
  const [successfulRounds, setSuccessfulRounds] = useState<number>(0);
  const [totalTaps, setTotalTaps] = useState<number>(0);
  const [correctTaps, setCorrectTaps] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const strikeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (strikeTimerRef.current) {
      clearTimeout(strikeTimerRef.current);
      strikeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Generate random non-overlapping coordinates for current round
  const spawnLevelTiles = useCallback((count: number) => {
    clearTimers();
    setShowMistakeFlash(false);
    setIsMasked(false);
    setExpectedNumber(1);

    const positions: number[] = [];
    while (positions.length < count) {
      const randCell = Math.floor(Math.random() * TOTAL_CELLS);
      if (!positions.includes(randCell)) {
        positions.push(randCell);
      }
    }

    const generatedTiles: ChimpTile[] = positions.map((cellIdx, i) => ({
      id: i + 1,
      number: i + 1,
      cellIndex: cellIdx,
      isClicked: false,
      isWrong: false,
    }));

    setTiles(generatedTiles);
    setPhase('memorize');
  }, [clearTimers]);

  const handleStartCountdown = () => {
    playTactileClick();
    setIsCountdownOpen(true);
  };

  const handleCountdownFinished = () => {
    setIsCountdownOpen(false);
    setLevel(1);
    setNumberCount(INITIAL_NUMBER_COUNT);
    setLives(MAX_LIVES);
    setMaxCompletedNumbers(0);
    setSuccessfulRounds(0);
    setTotalTaps(0);
    setCorrectTaps(0);
    setIsNewRecord(false);
    spawnLevelTiles(INITIAL_NUMBER_COUNT);
  };

  const handleTilePress = (tile: ChimpTile) => {
    if (phase !== 'memorize' && phase !== 'recall') return;
    if (tile.isClicked || showMistakeFlash) return;

    setTotalTaps((prev) => prev + 1);

    // Correct Next Number Clicked
    if (tile.number === expectedNumber) {
      setCorrectTaps((prev) => prev + 1);
      playChimpTap(expectedNumber);

      // Once the first tile is clicked, mask all remaining tiles immediately!
      if (!isMasked) {
        setIsMasked(true);
        setPhase('recall');
      }

      const updatedTiles = tiles.map((t) =>
        t.id === tile.id ? { ...t, isClicked: true } : t
      );
      setTiles(updatedTiles);

      // Check if current round is fully cleared
      if (expectedNumber === numberCount) {
        // Round Clear!
        const nextScore = numberCount;
        setMaxCompletedNumbers((prev) => Math.max(prev, nextScore));
        setSuccessfulRounds((prev) => prev + 1);
        playLevelClearFanfare(level);
        setPhase('round_success');

        // Transition smoothly to next level
        strikeTimerRef.current = setTimeout(() => {
          const nextCount = numberCount + 1;
          setLevel((prev) => prev + 1);
          setNumberCount(nextCount);
          spawnLevelTiles(nextCount);
        }, 800);
      } else {
        setExpectedNumber((prev) => prev + 1);
      }
    } else {
      // Wrong Number Clicked -> STRIKE!
      playChimpStrike();
      const updatedLives = lives - 1;
      setLives(updatedLives);
      setShowMistakeFlash(true);

      // Highlight wrong clicked tile and reveal all numbers
      setTiles((prev) =>
        prev.map((t) =>
          t.id === tile.id ? { ...t, isWrong: true } : t
        )
      );

      if (updatedLives <= 0) {
        // Game Over after strike reveal
        strikeTimerRef.current = setTimeout(() => {
          handleGameOver();
        }, 1200);
      } else {
        // Retry current level after brief flash
        strikeTimerRef.current = setTimeout(() => {
          spawnLevelTiles(numberCount);
        }, 1200);
      }
    }
  };

  const handleGameOver = () => {
    clearTimers();
    setPhase('game_over');

    const finalScore = maxCompletedNumbers;
    if (finalScore > 0) {
      const saveResult = saveBestRecord('chimp', finalScore);
      setIsNewRecord(saveResult.isNewBest);

      const evaluation = evaluateScoreTier('chimp', finalScore);
      addHistoryItem({
        mode: 'chimp',
        primaryMetric: finalScore,
        unit: 'Angka',
        ratingLabel: evaluation.badgeLabel,
        subMetric: `Level ${level} • ${successfulRounds} Ronde Berhasil`,
      });

      onRecordUpdated();
    }
  };

  const accuracyRate =
    totalTaps > 0 ? Math.round((correctTaps / totalTaps) * 100) : 0;
  const currentTierDetails = evaluateScoreTier('chimp', maxCompletedNumbers);

  return (
    <div className="min-h-full min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 select-none relative overflow-x-hidden">
      {/* Universal In-Game Navigation Header */}
      <InGameHUD
        title="Memori Simpanse"
        isGameActive={phase !== 'idle' && phase !== 'game_over'}
        onExit={onBackToMenu}
        onRestart={() => {
          clearTimers();
          setPhase('idle');
        }}
        onOpenGuide={() => {
          setInfoTab('guide');
          setIsInfoOpen(true);
        }}
        onOpenTierStandards={() => {
          setInfoTab('standards');
          setIsInfoOpen(true);
        }}
        onOpenRecord={() => setIsRecordOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-3 sm:px-6 w-full max-w-2xl mx-auto">
        {/* =========================================================================
            1. PREPARATION SCREEN (IDLE)
           ========================================================================= */}
        {phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center text-center space-y-6 max-w-lg mx-auto"
          >
            {/* Hero Icon Capsule */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-500/10 border border-amber-300/60 shadow-inner flex items-center justify-center text-amber-600">
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-xs">
                Ayumu Challenge
              </div>
            </div>

            {/* Mode Title & Abstract */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Memori Simpanse
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                Uji kapasitas memori visual fotografis seketika. Rekam letak semua angka di layar, lalu sentuh ubin polos secara berurutan setelah angka 1 ditekan!
              </p>
            </div>

            {/* Current Best Score Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Rekor Terbaik Anda
                </div>
                <div className="text-sm font-black text-slate-800">
                  {bestRecord ? `${bestRecord} Angka` : 'Belum Ada Rekor'}
                </div>
              </div>
            </div>

            {/* Rules Quick Peek */}
            <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 text-left">
              <div className="p-3 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
                <div className="text-amber-500 font-black text-base sm:text-lg mb-0.5">01</div>
                <div className="text-xs font-bold text-slate-800">Rekam Pola</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Amati seluruh angka sebelum menekan
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
                <div className="text-amber-500 font-black text-base sm:text-lg mb-0.5">02</div>
                <div className="text-xs font-bold text-slate-800">Ubin Tertutup</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Angka langsung tertutup saat tombol 1 ditekan
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
                <div className="text-amber-500 font-black text-base sm:text-lg mb-0.5">03</div>
                <div className="text-xs font-bold text-slate-800">3 Nyawa</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Maksimal 3 kesalahan sebelum Game Over
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full pt-2">
              <AppButton
                label="Mulai Tantangan"
                icon={<Play className="w-5 h-5 fill-current" />}
                variant="primary"
                onClick={handleStartCountdown}
                className="w-full sm:w-auto sm:min-w-[240px] py-3.5 text-base font-bold shadow-md shadow-rose-500/20"
              />
            </div>

            {/* Preparation Standard Footer */}
            <ModePreparationFooter
              onOpenGuide={() => {
                setInfoTab('guide');
                setIsInfoOpen(true);
              }}
              onOpenStandards={() => {
                setInfoTab('standards');
                setIsInfoOpen(true);
              }}
            />
          </motion.div>
        )}

        {/* =========================================================================
            2. ACTIVE GAMEPLAY SCREEN (MEMORIZE / RECALL)
           ========================================================================= */}
        {(phase === 'memorize' ||
          phase === 'recall' ||
          phase === 'round_success') && (
          <div className="w-full flex flex-col items-center space-y-4 sm:space-y-5 select-none">
            {/* In-Game Status HUD Bar */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-2xs">
              {/* Level & Numbers Metric */}
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-black tracking-wide">
                  Level {level}
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {numberCount} Angka
                </span>
              </div>

              {/* Target Next Number Prompt */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                <span>Sentuh:</span>
                <span className="font-mono font-black text-rose-600 text-sm">
                  {expectedNumber}
                </span>
              </div>

              {/* 3 Lives / Strikes Indicator */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                      i < lives
                        ? 'text-rose-500 fill-rose-500 scale-100'
                        : 'text-slate-300 fill-slate-200 scale-90'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Instruction Contextual Banner */}
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {!isMasked ? (
                  <motion.span
                    key="memorize-hint"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    Amati posisi semua angka, sentuh angka 1 untuk memulai!
                  </motion.span>
                ) : (
                  <motion.span
                    key="recall-hint"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Memori Aktif: Sentuh kotak tersembunyi secara berurutan!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Responsive Grid Board (5 Columns x 8 Rows) */}
            <div
              className="w-full max-w-md sm:max-w-lg aspect-[5/8] p-3 sm:p-4 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 grid grid-cols-5 grid-rows-8 gap-2 sm:gap-2.5 select-none relative overflow-hidden"
              style={{ touchAction: 'manipulation' }}
            >
              {/* Subtle Neural Grid Background Overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* Round Success Ripple Overlay */}
              {phase === 'round_success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-500/20 backdrop-blur-2xs z-20 flex items-center justify-center pointer-events-none"
                >
                  <div className="px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-400 text-emerald-400 text-sm font-black flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    Ronde Berhasil! +1 Angka
                  </div>
                </motion.div>
              )}

              {/* Render all 40 Cells in Grid */}
              {Array.from({ length: TOTAL_CELLS }).map((_, cellIndex) => {
                const tile = tiles.find((t) => t.cellIndex === cellIndex);

                if (!tile) {
                  return (
                    <div
                      key={`empty-${cellIndex}`}
                      className="w-full h-full rounded-xl sm:rounded-2xl bg-slate-800/20 border border-slate-800/30"
                    />
                  );
                }

                // If tile was already correctly clicked, it stays transparent/invisible
                if (tile.isClicked && !showMistakeFlash) {
                  return (
                    <div
                      key={`clicked-${tile.id}`}
                      className="w-full h-full rounded-xl sm:rounded-2xl border border-slate-800/20"
                    />
                  );
                }

                // Determine Tile Visual Representation
                const isRevealed = !isMasked || showMistakeFlash;
                const isWrong = tile.isWrong;

                return (
                  <motion.button
                    key={`tile-${tile.id}`}
                    type="button"
                    onClick={() => handleTilePress(tile)}
                    whileTap={{ scale: 0.92 }}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{
                      scale: isWrong ? [1, 1.1, 0.95, 1] : 1,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 25,
                    }}
                    className={`w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center font-mono font-black text-xl sm:text-2xl cursor-pointer select-none transition-colors duration-150 relative shadow-sm ${
                      isWrong
                        ? 'bg-rose-500 text-white border-2 border-rose-300 shadow-rose-500/40 shadow-md'
                        : isRevealed
                        ? 'bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200/90 shadow-xs'
                        : 'bg-slate-700 hover:bg-slate-600 text-transparent border border-slate-600/80 active:bg-slate-500'
                    }`}
                  >
                    {/* Render number if in memorize phase or revealed during mistake flash */}
                    {isRevealed ? (
                      tile.number
                    ) : (
                      // Unmarked masked tile dot indicator
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-500/50" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Bottom Controls / Round Counter Footer */}
            <div className="text-center text-xs text-slate-400 font-medium">
              Ronde Selesai: {successfulRounds} • Akurasi: {accuracyRate}%
            </div>
          </div>
        )}

        {/* =========================================================================
            3. GAME OVER / RESULT VIEW
           ========================================================================= */}
        {phase === 'game_over' && (
          <GameResultView
            modeTitle="Memori Simpanse"
            subModeLabel="Ayumu Kyoto Challenge"
            primaryScore={maxCompletedNumbers}
            scoreUnit="Angka"
            isNewRecord={isNewRecord}
            tierRank={currentTierDetails.rank}
            tierName={currentTierDetails.tierName}
            tierCaption={currentTierDetails.badgeLabel}
            tierDescription={currentTierDetails.desc}
            stats={[
              {
                id: 'max_numbers',
                label: 'Angka Maksimal',
                value: `${maxCompletedNumbers} Angka`,
                highlight: true,
              },
              {
                id: 'rounds_cleared',
                label: 'Ronde Berhasil',
                value: `${successfulRounds} Ronde`,
              },
              {
                id: 'accuracy',
                label: 'Akurasi Ketukan',
                value: `${accuracyRate}%`,
              },
              {
                id: 'total_taps',
                label: 'Total Ketukan',
                value: `${totalTaps} Kali`,
              },
            ]}
            onBackToMenu={onBackToMenu}
            onRetry={handleStartCountdown}
            retryLabel="Coba Lagi"
          />
        )}
      </main>

      {/* Universal 3-2-1 Countdown Modal */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onFinished={handleCountdownFinished}
      />

      {/* Mode Info & Scientific Standards Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="chimp"
        initialTab={infoTab}
      />

      {/* Mode Best Record Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="chimp"
        title="Memori Simpanse"
        unit="Angka"
      />
    </div>
  );
};
