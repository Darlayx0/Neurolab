import React, { useState, useEffect, useRef } from 'react';
import {
  BestRecords,
  MatrixGridSize,
} from '../../types';
import {
  saveBestRecord,
  getBestRecord,
  addHistoryItem,
  getMatrixEvaluation,
  EvaluationResult,
} from '../../utils/storage';
import { evaluateScoreTier, TIER_METADATA } from '../../utils/tierSystem';
import {
  playSuccessChime,
  playErrorBuzz,
  playStimulusBeep,
} from '../../utils/audio';
import {
  Grid3X3,
  Play,
  RotateCcw,
  AlertTriangle,
  Clock,
  Sparkles,
  Target,
} from 'lucide-react';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';

interface MatrixModeProps {
  records: BestRecords;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type Phase = 'idle' | 'running' | 'completed';

export const MatrixMode: React.FC<MatrixModeProps> = ({
  records,
  onRecordUpdated,
  onBackToMenu,
}) => {
  // Config & State
  const [gridSize, setGridSize] = useState<MatrixGridSize>(5);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);
  const [tiles, setTiles] = useState<number[]>([]);
  const [currentTarget, setCurrentTarget] = useState<number>(1);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [penaltyCount, setPenaltyCount] = useState<number>(0);
  const [lastPenaltyNotice, setLastPenaltyNotice] = useState<string | null>(null);
  const [isNewRecordEarned, setIsNewRecordEarned] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [finalTotalSeconds, setFinalTotalSeconds] = useState<number>(0);

  // Modals & Dialogs
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // Refs for precise timing & animation frame
  const startTimeRef = useRef<number>(0);
  const penaltyMsRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const penaltyNoticeTimerRef = useRef<number | null>(null);

  const totalTiles = gridSize * gridSize;
  const currentSubModeKey = `grid_${gridSize}`;
  const currentBestRecord = getBestRecord('matrix', currentSubModeKey);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (penaltyNoticeTimerRef.current) clearTimeout(penaltyNoticeTimerRef.current);
    };
  }, []);

  // Update stopwatch loop during 'running'
  useEffect(() => {
    if (phase !== 'running') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const updateTimer = () => {
      const now = performance.now();
      const rawElapsed = now - startTimeRef.current;
      setElapsedMs(rawElapsed + penaltyMsRef.current);
      animFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  // Start game handler
  const handleStartGame = () => {
    // Generate numbers 1..totalTiles in random order
    const array = Array.from({ length: totalTiles }, (_, i) => i + 1);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    setTiles(array);
    setCurrentTarget(1);
    setPenaltyCount(0);
    setLastPenaltyNotice(null);
    setIsNewRecordEarned(false);
    setEvaluation(null);

    penaltyMsRef.current = 0;
    startTimeRef.current = performance.now();
    setElapsedMs(0);

    setPhase('running');
  };

  // Handle tile click
  const handleTileClick = (tileNumber: number) => {
    if (phase !== 'running') return;

    if (tileNumber === currentTarget) {
      // SUCCESS HIT
      if (currentTarget === totalTiles) {
        // COMPLETED GAME
        const now = performance.now();
        const totalDurationMs = now - startTimeRef.current + penaltyMsRef.current;
        const totalSeconds = Number((totalDurationMs / 1000).toFixed(2));

        setElapsedMs(totalDurationMs);
        setFinalTotalSeconds(totalSeconds);

        const evalResult = getMatrixEvaluation(totalSeconds, gridSize);
        setEvaluation(evalResult);

        // Save Record
        const { isNewBest } = saveBestRecord('matrix', totalSeconds, currentSubModeKey);
        setIsNewRecordEarned(isNewBest);

        // Add History Item
        addHistoryItem({
          mode: 'matrix',
          subMode: currentSubModeKey,
          subModeLabel: `Grid ${gridSize}x${gridSize}`,
          primaryMetric: totalSeconds,
          unit: 's',
          ratingLabel: evalResult.tier,
          subMetric: `Grid ${gridSize}x${gridSize} • ${penaltyCount} Penalti (+${penaltyCount * 5}s)`,
        });

        onRecordUpdated();
        playSuccessChime();
        setPhase('completed');
      } else {
        // Step forward
        setCurrentTarget((prev) => prev + 1);
        playStimulusBeep(480 + (currentTarget * 12), 0.05);
      }
    } else if (tileNumber > currentTarget) {
      // MISCLICK PENALTY: +5 seconds
      playErrorBuzz();
      setPenaltyCount((prev) => prev + 1);
      penaltyMsRef.current += 5000;
      setElapsedMs((prev) => prev + 5000);

      setLastPenaltyNotice('+5.0s Penalti!');
      if (penaltyNoticeTimerRef.current) clearTimeout(penaltyNoticeTimerRef.current);
      penaltyNoticeTimerRef.current = window.setTimeout(() => {
        setLastPenaltyNotice(null);
      }, 1200);
    }
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    handleStartGame();
  };

  const handleRestartToPreparation = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (penaltyNoticeTimerRef.current) clearTimeout(penaltyNoticeTimerRef.current);
    setIsCountdownOpen(false);
    setElapsedMs(0);
    setCurrentTarget(1);
    setPenaltyCount(0);
    setLastPenaltyNotice(null);
    setPhase('idle');
  };

  const handleExitDirectly = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  const formattedTime = (elapsedMs / 1000).toFixed(2);

  // Dynamic grid class
  const getGridColsClass = () => {
    if (gridSize === 4) return 'grid-cols-4';
    if (gridSize === 5) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Top HUD - hidden when game completed */}
      {phase !== 'completed' && (
        <InGameHUD
          title="Pemindaian Angka"
          modeIcon={<Grid3X3 className="w-4 h-4 text-amber-600" />}
          isGameActive={phase === 'running' || isCountdownOpen}
          onExit={handleExitDirectly}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Center Stage Container (Edge-to-edge from top to bottom) */}
      <main className="w-full h-full min-h-[100dvh] px-3 sm:px-4 flex flex-col items-center justify-center relative z-10 pt-16 sm:pt-20 pb-20 sm:pb-24 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* 1. IDLE STATE: Essential Guide Only */}
        {phase === 'idle' && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in duration-200 my-auto relative z-10">
            <div className="w-full max-w-md flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
                <Grid3X3 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                Pemindaian Angka
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mb-4">
                Temukan dan klik angka dari <strong className="text-amber-700 font-bold">1 sampai {totalTiles}</strong> secara berurutan secepat mungkin.
              </p>

              {/* Grid Selector */}
              <div className="w-full mb-6 p-2 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 font-mono uppercase text-left px-1">
                  Pilih Ukuran Grid:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { size: 4 as MatrixGridSize, label: 'Grid 4x4', sub: '16 Angka' },
                    { size: 5 as MatrixGridSize, label: 'Grid 5x5', sub: '25 Angka' },
                    { size: 6 as MatrixGridSize, label: 'Grid 6x6', sub: '36 Angka' },
                  ].map((item) => (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => setGridSize(item.size)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-98 ${
                        gridSize === item.size
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm font-black'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-bold'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-mono">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          gridSize === item.size ? 'text-amber-100' : 'text-slate-400'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <AppButton
                id="btn-start-matrix"
                label="MULAI PEMINDAIAN"
                icon={<Play className="w-4 h-4 fill-current" />}
                iconPosition="leading"
                variant="primary"
                onClick={() => setIsCountdownOpen(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/15 text-xs sm:text-sm w-full"
              />
            </div>
          </div>
        )}

        {/* 2. RUNNING STATE: Active Matrix Board */}
        {phase === 'running' && (
          <div className="w-full flex flex-col items-center my-auto relative z-10 animate-in fade-in duration-150">
            {/* Realtime Targets, Progress & Stopwatch Banner */}
            <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-2 mb-3">
              <div className="w-full flex items-center justify-between px-1 text-xs">
                {/* Current Target Indicator */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-900 border border-amber-300/80 shadow-xs">
                    <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-slate-600">Cari:</span>
                    <span className="text-sm font-black font-mono text-amber-800">{currentTarget}</span>
                    <span className="text-slate-400 font-mono">/ {totalTiles}</span>
                  </div>

                  {lastPenaltyNotice && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-mono font-bold animate-in fade-in zoom-in-95 duration-150 shadow-xs">
                      {lastPenaltyNotice}
                    </span>
                  )}
                </div>

                {/* Right Side: Best Record & Live Stopwatch */}
                <div className="flex items-center gap-2">
                  {currentBestRecord !== null && (
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      Rekor: <strong className="text-slate-800 font-bold">{currentBestRecord.toFixed(2)}s</strong>
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-slate-800 bg-white px-3 py-1 rounded-full border border-slate-200/90 shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formattedTime}s</span>
                  </div>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-150"
                  style={{ width: `${((currentTarget - 1) / totalTiles) * 100}%` }}
                />
              </div>
            </div>

            {/* Matrix Grid Stage - Open Stage, Elegant Tiles */}
            <div
              className={`w-full max-w-sm sm:max-w-md aspect-square grid ${getGridColsClass()} gap-2 sm:gap-2.5`}
            >
              {tiles.map((num) => {
                const isCleared = num < currentTarget;

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleTileClick(num)}
                    disabled={isCleared}
                    className={`rounded-2xl font-mono font-black select-none transition-all flex items-center justify-center cursor-pointer relative ${
                      gridSize === 4
                        ? 'text-xl sm:text-2xl'
                        : gridSize === 5
                        ? 'text-lg sm:text-xl'
                        : 'text-base sm:text-lg'
                    } ${
                      isCleared
                        ? 'bg-slate-100/70 border border-slate-200/60 text-slate-300 pointer-events-none scale-[0.98]'
                        : 'bg-white hover:bg-amber-50/40 text-slate-800 border border-slate-200 hover:border-amber-300 shadow-xs active:scale-[0.96] active:bg-amber-100'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. COMPLETED STATE: Seamless Open-Canvas Result View */}
        {phase === 'completed' && (() => {
          const tierEval = evaluateScoreTier('matrix', finalTotalSeconds, currentSubModeKey);
          return (
            <GameResultView
              modeTitle="Pemindaian Angka"
              subModeLabel={`Grid ${gridSize}x${gridSize}`}
              primaryScore={finalTotalSeconds}
              scoreUnit="s"
              isNewRecord={isNewRecordEarned}
              tierRank={tierEval.rank || evaluation?.rank}
              tierName={tierEval.tierName}
              tierCaption={tierEval.badgeLabel || `Standar Grid ${gridSize}x${gridSize}`}
              tierDescription={tierEval.desc || evaluation?.desc}
              stats={[
                {
                  id: 'penalty',
                  label: 'Total Penalti',
                  value: `${penaltyCount}x (+${penaltyCount * 5} detik)`,
                },
                {
                  id: 'avg-per-tile',
                  label: 'Rerata / Angka',
                  value: `${(finalTotalSeconds / totalTiles).toFixed(2)} detik`,
                  highlight: true,
                },
                {
                  id: 'accuracy',
                  label: 'Akurasi Klik',
                  value: `${Math.round((totalTiles / (totalTiles + penaltyCount)) * 100)}%`,
                },
              ]}
              onBackToMenu={onBackToMenu}
              onRetry={handleRestartToPreparation}
            />
          );
        })()}
      </main>

      {/* Bottom Preparation Footer (Shown ONLY in IDLE state) */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="matrix"
          bestRecord={currentBestRecord}
          unit="s"
          subModeLabel={`Grid ${gridSize}x${gridSize}`}
          subModeId={currentSubModeKey}
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
        title="Pemindaian Angka"
        accentColor="amber"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="matrix"
        initialTab={infoTab}
        initialSubMode={currentSubModeKey}
      />

      {/* Record Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="matrix"
        modeTitle="Pemindaian Angka"
        unit="s"
        initialSubMode={currentSubModeKey}
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
