import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FlankerDirection,
  FlankerTrialConfig,
  FlankerTrialResult,
  FlankerSessionSummary,
} from '../../types';
import {
  FLANKER_TOTAL_TRIALS,
  FLANKER_RESPONSE_TIMEOUT_MS,
  FLANKER_INITIAL_TIMEOUT_MS,
  FLANKER_FINAL_TIMEOUT_MS,
  generateFlankerTrials,
  calculateFlankerSummary,
} from '../../utils/flankerGenerator';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier, cleanTierTitle } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView, GameResultStat } from '../common/GameResultView';
import {
  ShieldAlert,
  Play,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Zap,
  Crosshair,
  Compass,
} from 'lucide-react';

interface FlankerModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type FlankerGameState = 'idle' | 'fixation' | 'active' | 'completed';

export const FlankerMode: React.FC<FlankerModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [gameState, setGameState] = useState<FlankerGameState>('idle');
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);
  const [currentTrialIdx, setCurrentTrialIdx] = useState<number>(0);
  const [activeTrial, setActiveTrial] = useState<FlankerTrialConfig | null>(null);
  const [summary, setSummary] = useState<FlankerSessionSummary | null>(null);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);

  // Micro-Feedback Visual FX State
  const [lastFeedback, setLastFeedback] = useState<'none' | 'correct' | 'wrong' | 'timeout'>('none');
  const [feedbackKey, setFeedbackKey] = useState<number>(0);

  // Modal Dialogs
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // High-precision references
  const trialsRef = useRef<FlankerTrialConfig[]>([]);
  const currentTrialIdxRef = useRef<number>(0);
  const trialResultsRef = useRef<FlankerTrialResult[]>([]);
  const trialStartTimeRef = useRef<number | null>(null);
  const isAcceptingInputRef = useRef<boolean>(false);
  const activeTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  // Synchronize state references
  useEffect(() => {
    currentTrialIdxRef.current = currentTrialIdx;
  }, [currentTrialIdx]);

  // Clean up all active timers on unmount
  useEffect(() => {
    return () => {
      if (activeTimerRef.current !== null) {
        window.clearTimeout(activeTimerRef.current);
        activeTimerRef.current = null;
      }
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, []);

  const clearActiveTimer = () => {
    if (activeTimerRef.current !== null) {
      window.clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
  };

  const triggerFeedback = (type: 'correct' | 'wrong' | 'timeout') => {
    setLastFeedback(type);
    setFeedbackKey((k) => k + 1);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setLastFeedback('none');
    }, 450);
  };

  const handleStartCountdown = () => {
    setIsCountdownOpen(true);
  };

  const handleRestartToPreparation = () => {
    clearActiveTimer();
    isAcceptingInputRef.current = false;
    trialStartTimeRef.current = null;
    setIsCountdownOpen(false);
    setGameState('idle');
    setCurrentTrialIdx(0);
    setActiveTrial(null);
    setSummary(null);
    setIsNewBest(false);
    setLastFeedback('none');
  };

  const finishSession = useCallback(
    (results: FlankerTrialResult[]) => {
      clearActiveTimer();
      isAcceptingInputRef.current = false;

      const finalSummary = calculateFlankerSummary(results);
      setSummary(finalSummary);

      // Save Best Record
      const { isNewBest: newBestAchieved } = saveBestRecord(
        'flanker',
        finalSummary.totalScore
      );
      setIsNewBest(newBestAchieved);

      // Save History Entry
      const tier = evaluateScoreTier('flanker', finalSummary.totalScore);
      addHistoryItem({
        mode: 'flanker',
        primaryMetric: finalSummary.totalScore,
        unit: 'Poin',
        ratingLabel: tier.badgeLabel,
        subMetric: `Akurasi ${finalSummary.accuracyRate}% • Rerata ${finalSummary.meanReactionTimeMs}ms • Streak ${finalSummary.bestStreak}`,
      });

      playSuccessChime();
      onRecordUpdated();
      setGameState('completed');
    },
    [onRecordUpdated]
  );

  const presentNextTrial = useCallback(() => {
    clearActiveTimer();
    isAcceptingInputRef.current = false;

    const nextIndex = currentTrialIdxRef.current + 1;
    if (nextIndex > FLANKER_TOTAL_TRIALS) {
      finishSession(trialResultsRef.current);
      return;
    }

    setCurrentTrialIdx(nextIndex);
    currentTrialIdxRef.current = nextIndex;
    const nextTrial = trialsRef.current[nextIndex - 1];

    // Phase 1: In-Place Fixation Jeda (ISI)
    setGameState('fixation');
    setActiveTrial(nextTrial);

    activeTimerRef.current = window.setTimeout(() => {
      // Phase 2: Active Stimulus Presentation
      setGameState('active');
      trialStartTimeRef.current = performance.now();
      isAcceptingInputRef.current = true;

      // Setup Response Window Timeout (Dynamic Decay per trial)
      activeTimerRef.current = window.setTimeout(() => {
        if (!isAcceptingInputRef.current) return;
        isAcceptingInputRef.current = false;

        playErrorBuzz();
        triggerFeedback('timeout');

        const omissionResult: FlankerTrialResult = {
          trialIndex: nextTrial.trialIndex,
          targetDirection: nextTrial.targetDirection,
          flankerDirection: nextTrial.flankerDirection,
          rule: nextTrial.rule,
          isCongruent: nextTrial.isCongruent,
          conflictType: nextTrial.conflictType,
          userResponse: null,
          isCorrect: false,
          reactionTimeMs: nextTrial.timeoutMs,
          timestamp: Date.now(),
        };

        trialResultsRef.current.push(omissionResult);
        presentNextTrial();
      }, nextTrial.timeoutMs);
    }, nextTrial.isiDurationMs);
  }, [finishSession]);

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    const newTrials = generateFlankerTrials();
    trialsRef.current = newTrials;
    trialResultsRef.current = [];
    currentTrialIdxRef.current = 0;
    setCurrentTrialIdx(0);
    setLastFeedback('none');

    presentNextTrial();
  };

  const handleUserChoice = useCallback(
    (choice: FlankerDirection) => {
      if (!isAcceptingInputRef.current || trialStartTimeRef.current === null) return;
      isAcceptingInputRef.current = false;
      clearActiveTimer();

      const responseTime = performance.now();
      const reactionTimeMs = Math.round(responseTime - trialStartTimeRef.current);
      const currentTrial = trialsRef.current[currentTrialIdxRef.current - 1];

      if (!currentTrial) return;

      const isCorrect = choice === currentTrial.expectedResponse;

      if (isCorrect) {
        playTactileClick();
        triggerFeedback('correct');
      } else {
        playErrorBuzz();
        triggerFeedback('wrong');
      }

      const trialResult: FlankerTrialResult = {
        trialIndex: currentTrial.trialIndex,
        targetDirection: currentTrial.targetDirection,
        flankerDirection: currentTrial.flankerDirection,
        rule: currentTrial.rule,
        isCongruent: currentTrial.isCongruent,
        conflictType: currentTrial.conflictType,
        userResponse: choice,
        isCorrect,
        reactionTimeMs,
        timestamp: Date.now(),
      };

      trialResultsRef.current.push(trialResult);
      presentNextTrial();
    },
    [presentNextTrial]
  );

  // Keyboard Navigation Listener (4-Way Support: Arrow Keys & WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'active') return;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleUserChoice('up');
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        handleUserChoice('down');
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handleUserChoice('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleUserChoice('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, handleUserChoice]);

  // Evaluate Tier Metadata
  const currentScoreForTier = summary ? summary.totalScore : bestRecord;
  const tierInfo = evaluateScoreTier('flanker', currentScoreForTier);

  // Compute Results for Diagnostics View
  const computedStats: GameResultStat[] = summary
    ? [
        {
          id: 'stat-accuracy',
          label: 'Akurasi Eksekutif (Maks 500 Poin)',
          value: `${summary.accuracyRate}% (${summary.completedTrials - summary.commissionErrors}/${summary.totalTrials}) • +${summary.accuracyPoints} Pts`,
          highlight: true,
        },
        {
          id: 'stat-speed',
          label: 'Kecepatan Reaksi (Maks 350 Poin)',
          value: `${summary.meanReactionTimeMs} ms • +${summary.speedBonus} Pts`,
          highlight: true,
        },
        {
          id: 'stat-streak',
          label: 'Runtutan Beruntun (Maks 150 Poin)',
          value: `${summary.bestStreak} Trial Berurutan • +${summary.streakBonus} Pts`,
          highlight: true,
        },
        {
          id: 'stat-penalty',
          label: 'Penalti Kesalahan (-15 Poin/Error)',
          value: `-${summary.penaltyPoints} Poin (${summary.commissionErrors} Salah, ${summary.omissionErrors} Terlambat)`,
        },
        {
          id: 'stat-fastest-rt',
          label: 'Waktu Respons Tercepat',
          value: `${summary.fastestRtMs} ms`,
        },
        {
          id: 'stat-flanker-cost',
          label: 'Biaya Interferensi Distraktor',
          value: `${summary.flankerInterferenceCostMs} ms`,
        },
      ]
    : [];

  // Helper untuk me-render ikon panah 4-arah
  const renderDirectionIcon = (
    direction: FlankerDirection,
    className: string = 'w-8 h-8'
  ) => {
    switch (direction) {
      case 'up':
        return <ArrowUp className={className} />;
      case 'down':
        return <ArrowDown className={className} />;
      case 'left':
        return <ArrowLeft className={className} />;
      case 'right':
        return <ArrowRight className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      {/* 1. In-Game HUD Header */}
      {gameState !== 'completed' && (
        <InGameHUD
          title="Inhibisi Flanker 4-Arah"
          modeIcon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
          isGameActive={gameState !== 'idle' || isCountdownOpen}
          onExit={onBackToMenu}
          onRestart={handleRestartToPreparation}
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
      )}

      {/* 2. Main Game Body Layout */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
        {/* State 1: IDLE / PREPARATION SCREEN */}
        {gameState === 'idle' && (
          <div className="max-w-md w-full text-center flex flex-col items-center py-2 animate-in fade-in duration-200">
            {/* Hero Mode Badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center mb-4 text-amber-600 shadow-xs">
              <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2]" />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Inhibisi Flanker
            </h1>

            {/* Direct & Action-Oriented Microcopy */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mb-5">
              Fokuskan pandangan pada <strong>kartu tengah</strong>. Abaikan 4 kartu pengapit, lalu respons secepat mungkin sesuai warna panah.
            </p>

            {/* Visual Rule Strip - Clean, Elegant Split Container */}
            <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200/90 shadow-xs p-3.5 mb-4 grid grid-cols-2 divide-x divide-slate-100 text-center">
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Target Hijau</span>
                </div>
                <span className="text-xs font-bold text-slate-800">SEARAH</span>
                <span className="text-[10px] text-slate-500">Tekan arah sama (↑ = ↑)</span>
              </div>

              <div className="flex flex-col items-center gap-1 px-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Target Merah</span>
                </div>
                <span className="text-xs font-bold text-slate-800">KEBALIKAN</span>
                <span className="text-[10px] text-slate-500">Lawan 180° (↑ = ↓)</span>
              </div>
            </div>

            {/* Metadata Specs Bar - Single Concise Line */}
            <div className="flex items-center justify-center gap-2.5 text-[11px] font-mono text-slate-500 mb-6 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>30 Trial (1.500 ms ➔ 550 ms)</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>D-Pad / WASD / Arrow</span>
              </span>
            </div>

            {/* Primary Action Button */}
            <div className="w-full max-w-xs">
              <AppButton
                id="flanker-start-btn"
                label="Mulai Pengujian (30 Trial)"
                icon={<Play className="w-4 h-4 fill-white" />}
                iconPosition="leading"
                variant="primary"
                onClick={handleStartCountdown}
                className="w-full py-3.5 shadow-md shadow-slate-900/15 text-sm"
              />
            </div>
          </div>
        )}

        {/* State 2 & 3: IN-GAME PRESENTATION (PERSISTENT IN-PLACE LAYOUT) */}
        {(gameState === 'fixation' || gameState === 'active') && activeTrial && (
          <div
            className={`max-w-md w-full flex flex-col items-center justify-center min-h-[340px] animate-in fade-in duration-150 transition-transform ${
              lastFeedback === 'wrong' || lastFeedback === 'timeout'
                ? 'animate-[shake_160ms_ease-in-out]'
                : ''
            }`}
          >
            {/* A. Session Progress Bar: Refill saat fixation, Smooth dynamic countdown saat active */}
            <div className="w-full mb-5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 mb-1.5 px-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      gameState === 'active'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-slate-700">TEMPO: {activeTrial.timeoutMs} ms</span>
                </span>
                <span className="text-slate-400 font-bold">
                  Trial {currentTrialIdx} / {FLANKER_TOTAL_TRIALS}
                </span>
              </div>

              {/* Progress Track Container */}
              <div className="w-full h-2 bg-slate-200/90 rounded-full overflow-hidden border border-slate-300/70 shadow-inner relative">
                {/* Dynamic Solid Progress Bar (Warna dinamis berdasarkan persentase, bebas gradasi, animasi refill) */}
                <div
                  key={`progress-${gameState}-${activeTrial.trialIndex}`}
                  className="h-full rounded-full origin-left"
                  style={{
                    animation:
                      gameState === 'active'
                        ? `flankerCountdownBar ${activeTrial.timeoutMs}ms linear forwards`
                        : 'flankerBarRefill 250ms ease-out forwards',
                  }}
                />
              </div>
            </div>

            {/* B. Directive Indicator Capsule (Stabil di posisi tanpa pergeseran) */}
            <div className="flex items-center justify-between w-full mb-4 px-1">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                Target: {activeTrial.rule === 'direct' ? 'SEARAH' : 'LAWAN ARAH'}
              </span>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTrial.rule === 'direct'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activeTrial.rule === 'direct' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
                <span>
                  {activeTrial.rule === 'direct' ? 'Tekan Searah Panah' : 'Tekan Kebalikan 180°'}
                </span>
              </div>
            </div>

            {/* C. Flanker Stimulus Array: Wadah Cerah Harmonis & Kartu Melebur Sempurna */}
            <div
              id="flanker-stimulus-array"
              className="w-full flex items-center justify-center gap-1.5 sm:gap-2.5 py-6 sm:py-8 px-2 sm:px-4 rounded-3xl bg-slate-100/90 border border-slate-200/90 shadow-xs mb-6 relative overflow-hidden min-h-[140px] sm:min-h-[160px]"
            >
              {/* Subtle background peripheral dot matrix */}
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

              {gameState === 'fixation' ? (
                /* In-Place Loading Reticle saat jeda ISI (Tanpa Menutup Tampilan Keseluruhan) */
                <div className="flex flex-col items-center justify-center py-2 animate-in fade-in duration-100 relative z-10">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-400 animate-spin [animation-duration:3s]" />
                    <div className="absolute w-6 h-6 rounded-full border border-amber-300/80" />
                    <Crosshair className="w-4 h-4 text-amber-600 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-bold mt-2.5 tracking-wider uppercase">
                    Fokus Kartu Tengah
                  </span>
                </div>
              ) : (
                /* 5 Static Cards: Kartu Distraktor Diam & Target Melebur Sempurna */
                <>
                  {/* DISTRACTOR 1 (Kiri Luar) - STATIS & DIAM */}
                  <div className="w-12 h-20 sm:w-16 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex items-center justify-center text-white shrink-0 select-none pointer-events-none relative overflow-hidden">
                    {renderDirectionIcon(
                      activeTrial.flankerDirection,
                      'w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[4]'
                    )}
                  </div>

                  {/* DISTRACTOR 2 (Kiri Dalam) - STATIS & DIAM */}
                  <div className="w-12 h-20 sm:w-16 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex items-center justify-center text-white shrink-0 select-none pointer-events-none relative overflow-hidden">
                    {renderDirectionIcon(
                      activeTrial.flankerDirection,
                      'w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[4]'
                    )}
                  </div>

                  {/* TARGET UTAMA TENGAH (Posisi ke-3) - BORDER SERAGAM & MELEBUR SEMPURNA */}
                  <div
                    id="flanker-focal-target"
                    className="w-12 h-20 sm:w-16 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex items-center justify-center relative shrink-0 z-10 mx-0.5 sm:mx-1 overflow-hidden"
                  >
                    {renderDirectionIcon(
                      activeTrial.targetDirection,
                      activeTrial.rule === 'direct'
                        ? 'w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 stroke-[4]'
                        : 'w-8 h-8 sm:w-10 sm:h-10 text-rose-400 stroke-[4]'
                    )}

                    {/* Instant Feedback Ripple Ring */}
                    {lastFeedback === 'correct' && (
                      <div
                        key={`feedback-ripple-${feedbackKey}`}
                        className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping pointer-events-none"
                      />
                    )}
                  </div>

                  {/* DISTRACTOR 3 (Kanan Dalam) - STATIS & DIAM */}
                  <div className="w-12 h-20 sm:w-16 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex items-center justify-center text-white shrink-0 select-none pointer-events-none relative overflow-hidden">
                    {renderDirectionIcon(
                      activeTrial.flankerDirection,
                      'w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[4]'
                    )}
                  </div>

                  {/* DISTRACTOR 4 (Kanan Luar) - STATIS & DIAM */}
                  <div className="w-12 h-20 sm:w-16 sm:h-24 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex items-center justify-center text-white shrink-0 select-none pointer-events-none relative overflow-hidden">
                    {renderDirectionIcon(
                      activeTrial.flankerDirection,
                      'w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[4]'
                    )}
                  </div>
                </>
              )}
            </div>

            {/* D. Responsive Cross D-Pad Dock (Ergonomic 4-Way Thumb Zone - Tetap Terlihat & Stabil) */}
            <div
              className={`w-full max-w-xs mx-auto flex flex-col items-center gap-2 transition-opacity duration-150 ${
                gameState === 'fixation' ? 'pointer-events-none opacity-80' : 'opacity-100'
              }`}
            >
              {/* Baris Atas: Tombol UP */}
              <button
                type="button"
                id="flanker-btn-up"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleUserChoice('up');
                }}
                className="w-20 sm:w-24 h-13 sm:h-14 rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-slate-200 shadow-xs active:scale-95 transition-transform flex flex-col items-center justify-center cursor-pointer select-none"
                aria-label="Arah Atas"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                <span className="text-[9px] font-mono text-slate-400 font-bold">W / ↑</span>
              </button>

              {/* Baris Tengah: Tombol LEFT, Indikator Netral, Tombol RIGHT */}
              <div className="w-full flex items-center justify-center gap-3">
                {/* Tombol LEFT */}
                <button
                  type="button"
                  id="flanker-btn-left"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleUserChoice('left');
                  }}
                  className="w-20 sm:w-24 h-13 sm:h-14 rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-slate-200 shadow-xs active:scale-95 transition-transform flex flex-col items-center justify-center cursor-pointer select-none"
                  aria-label="Arah Kiri"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-[9px] font-mono text-slate-400 font-bold">A / ←</span>
                </button>

                {/* Indikator Pusat Reticle */}
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                  <Crosshair className="w-4 h-4" />
                </div>

                {/* Tombol RIGHT */}
                <button
                  type="button"
                  id="flanker-btn-right"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleUserChoice('right');
                  }}
                  className="w-20 sm:w-24 h-13 sm:h-14 rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-slate-200 shadow-xs active:scale-95 transition-transform flex flex-col items-center justify-center cursor-pointer select-none"
                  aria-label="Arah Kanan"
                >
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-[9px] font-mono text-slate-400 font-bold">D / →</span>
                </button>
              </div>

              {/* Baris Bawah: Tombol DOWN */}
              <button
                type="button"
                id="flanker-btn-down"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleUserChoice('down');
                }}
                className="w-20 sm:w-24 h-13 sm:h-14 rounded-2xl border bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border-slate-200 shadow-xs active:scale-95 transition-transform flex flex-col items-center justify-center cursor-pointer select-none"
                aria-label="Arah Bawah"
              >
                <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                <span className="text-[9px] font-mono text-slate-400 font-bold">S / ↓</span>
              </button>
            </div>
          </div>
        )}

        {/* State 4: COMPLETED SUMMARY VIEW */}
        {gameState === 'completed' && summary && (
          <GameResultView
            modeTitle="Inhibisi Flanker 4-Arah"
            primaryScore={summary.totalScore}
            scoreUnit="Poin"
            isNewRecord={isNewBest}
            tierRank={tierInfo.rank}
            tierName={tierInfo.tierName}
            tierCaption={cleanTierTitle(tierInfo.badgeLabel)}
            tierDescription={tierInfo.desc}
            stats={computedStats}
            onBackToMenu={onBackToMenu}
            onRetry={handleRestartToPreparation}
          />
        )}
      </main>

      {/* 3. Preparation Footer (Idle State only) */}
      {gameState === 'idle' && (
        <ModePreparationFooter
          mode="flanker"
          bestRecord={bestRecord}
          unit="Poin"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* 4. Universal Countdown Overlay */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Inhibisi Flanker 4-Arah"
        accentColor="amber"
      />

      {/* 5. Information & Standards Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="flanker"
        initialTab={infoTab}
      />

      {/* 6. Records & History Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="flanker"
        modeTitle="Inhibisi Flanker 4-Arah"
        unit="Poin"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
