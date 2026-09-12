import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { saveBestRecord, getBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import {
  Layers,
  Play,
  Target,
} from 'lucide-react';

interface NBackModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type NBackPhase = 'idle' | 'running' | 'completed';

interface SessionSummary {
  accuracy: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  totalTargets: number;
  avgRT: number;
  tierEval: ReturnType<typeof evaluateScoreTier>;
  isNewRecord: boolean;
}

const STIMULUS_POOL = ['A', 'B', 'C', 'D', 'H', 'K', 'M', 'R', 'T', 'X'];
const TOTAL_TRIALS = 20;
const STIMULUS_VISIBLE_MS = 1400;
const STIMULUS_ISI_MS = 600;
const TOTAL_TRIAL_MS = STIMULUS_VISIBLE_MS + STIMULUS_ISI_MS; // 2000ms

export const NBackMode: React.FC<NBackModeProps> = ({
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [phase, setPhase] = useState<NBackPhase>('idle');
  const [nLevel, setNLevel] = useState<number>(2); // 1, 2, or 3

  const currentSubModeKey = `${nLevel}_back`;
  const currentBestRecord = getBestRecord('nback', currentSubModeKey);
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isStimulusVisible, setIsStimulusVisible] = useState<boolean>(false);
  const [isNewRecordEarned, setIsNewRecordEarned] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Instant response visual feedback
  const [hasRespondedInTrial, setHasRespondedInTrial] = useState<boolean>(false);
  const [lastResponseFeedback, setLastResponseFeedback] = useState<'hit' | 'false_alarm' | null>(null);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // Reliable Session Reference Stores (immune to closure races)
  const sequenceRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const hasRespondedInTrialRef = useRef<boolean>(false);
  const userResponsesRef = useRef<{ [trialIndex: number]: { responded: boolean; rt: number } }>({});
  const trialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stimulusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trialStartTimeRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (trialTimerRef.current) {
      clearTimeout(trialTimerRef.current);
      trialTimerRef.current = null;
    }
    if (stimulusTimerRef.current) {
      clearTimeout(stimulusTimerRef.current);
      stimulusTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const generateNBackSequence = useCallback((level: number, total: number): string[] => {
    const seq: string[] = [];
    const minTargets = Math.round(total * 0.3); // ~6 targets
    let targetCount = 0;

    for (let i = 0; i < total; i++) {
      const canBeTarget = i >= level;
      const forceTarget = canBeTarget && targetCount < minTargets && total - i <= minTargets - targetCount;
      const makeTarget = forceTarget || (canBeTarget && Math.random() < 0.35 && targetCount < 8);

      if (makeTarget) {
        seq.push(seq[i - level]);
        targetCount++;
      } else {
        let char: string;
        do {
          char = STIMULUS_POOL[Math.floor(Math.random() * STIMULUS_POOL.length)];
        } while (canBeTarget && char === seq[i - level]);
        seq.push(char);
      }
    }
    return seq;
  }, []);

  const isMatchAtIndex = useCallback((index: number, seq: string[], level: number): boolean => {
    if (index < level || index >= seq.length) return false;
    return seq[index] === seq[index - level];
  }, []);

  const completeSession = useCallback(() => {
    clearAllTimers();

    const seq = sequenceRef.current;
    const total = seq.length;
    let finalHits = 0;
    let finalMisses = 0;
    let finalFalseAlarms = 0;
    let finalCorrectRejections = 0;
    const rts: number[] = [];
    let totalTargets = 0;

    for (let i = 0; i < total; i++) {
      const isTarget = isMatchAtIndex(i, seq, nLevel);
      if (isTarget) totalTargets++;

      const resp = userResponsesRef.current[i];
      const responded = resp?.responded ?? false;

      if (isTarget) {
        if (responded) {
          finalHits++;
          if (resp?.rt) rts.push(resp.rt);
        } else {
          finalMisses++;
        }
      } else {
        if (responded) {
          finalFalseAlarms++;
          if (resp?.rt) rts.push(resp.rt);
        } else {
          finalCorrectRejections++;
        }
      }
    }

    const totalCorrect = finalHits + finalCorrectRejections;
    const accuracy = Math.round((totalCorrect / total) * 100);
    const avgRT = rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;

    const subModeKey = `${nLevel}_back`;
    const tierEval = evaluateScoreTier('nback', accuracy, subModeKey);
    const { isNewBest } = saveBestRecord('nback', accuracy, subModeKey);
    setIsNewRecordEarned(isNewBest);

    addHistoryItem({
      mode: 'nback',
      subMode: subModeKey,
      subModeLabel: `Level ${nLevel}-Back`,
      primaryMetric: accuracy,
      unit: '%',
      ratingLabel: tierEval.badgeLabel || tierEval.tierName,
      subMetric: `Level ${nLevel}-Back • Hits: ${finalHits}/${totalTargets} • Koreksi: ${finalCorrectRejections} • Salah: ${finalFalseAlarms} • Misses: ${finalMisses} • Rerata RT: ${avgRT}ms`,
    });

    setSessionSummary({
      accuracy,
      hits: finalHits,
      misses: finalMisses,
      falseAlarms: finalFalseAlarms,
      correctRejections: finalCorrectRejections,
      totalTargets,
      avgRT,
      tierEval,
      isNewRecord: isNewBest,
    });

    setPhase('completed');
    onRecordUpdated();
  }, [clearAllTimers, isMatchAtIndex, nLevel, onRecordUpdated]);

  const runTrial = useCallback(
    (index: number) => {
      if (index >= TOTAL_TRIALS) {
        completeSession();
        return;
      }

      currentIndexRef.current = index;
      setCurrentIndex(index);
      hasRespondedInTrialRef.current = false;
      setHasRespondedInTrial(false);
      setLastResponseFeedback(null);
      setIsStimulusVisible(true);
      trialStartTimeRef.current = Date.now();

      playTactileClick();

      stimulusTimerRef.current = setTimeout(() => {
        setIsStimulusVisible(false);
      }, STIMULUS_VISIBLE_MS);

      trialTimerRef.current = setTimeout(() => {
        runTrial(index + 1);
      }, TOTAL_TRIAL_MS);
    },
    [completeSession]
  );

  const startTest = () => {
    clearAllTimers();
    const newSeq = generateNBackSequence(nLevel, TOTAL_TRIALS);
    sequenceRef.current = newSeq;
    setSequence(newSeq);
    userResponsesRef.current = {};
    currentIndexRef.current = -1;
    hasRespondedInTrialRef.current = false;
    setHasRespondedInTrial(false);
    setLastResponseFeedback(null);
    setIsNewRecordEarned(false);
    setSessionSummary(null);
    setPhase('running');

    runTrial(0);
  };

  const handleUserMatchPress = useCallback(() => {
    if (phase !== 'running' || hasRespondedInTrialRef.current) return;
    const idx = currentIndexRef.current;
    if (idx < 0 || idx >= TOTAL_TRIALS) return;

    hasRespondedInTrialRef.current = true;
    setHasRespondedInTrial(true);

    const rt = Date.now() - trialStartTimeRef.current;
    const seq = sequenceRef.current;
    const isTarget = isMatchAtIndex(idx, seq, nLevel);

    userResponsesRef.current[idx] = { responded: true, rt };

    if (isTarget) {
      playSuccessChime();
      setLastResponseFeedback('hit');
    } else {
      playErrorBuzz();
      setLastResponseFeedback('false_alarm');
    }
  }, [phase, isMatchAtIndex, nLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'running') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleUserMatchPress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, handleUserMatchPress]);

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startTest();
  };

  const handleRestartToPreparation = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    currentIndexRef.current = -1;
    userResponsesRef.current = {};
    hasRespondedInTrialRef.current = false;
    setHasRespondedInTrial(false);
    setLastResponseFeedback(null);
    setIsNewRecordEarned(false);
    setSessionSummary(null);
    setCurrentIndex(-1);
    setPhase('idle');
  };

  const handleExitDirectly = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Top HUD - hidden when completed */}
      {phase !== 'completed' && (
        <InGameHUD
          title="Penyelarasan Memori"
          modeIcon={<Layers className="w-4 h-4 text-cyan-600" />}
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

      {/* Main Interactive Stage (Edge-to-edge from top to bottom) */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-3 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* 1. IDLE - Preparation View */}
          {phase === 'idle' && (
            <motion.div
              key="intro-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full flex flex-col items-center relative z-10 my-auto text-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mb-4 text-cyan-600 shadow-xs">
                <Layers className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                Penyelarasan Memori
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Tekan tombol cocok <strong className="text-cyan-700 font-bold">HANYA JIKA</strong> huruf yang tampil sama persis dengan huruf <strong className="text-slate-900 font-bold">{nLevel} langkah sebelumnya</strong>.
              </p>

              {/* Segmented Level Selector */}
              <div className="w-full p-2 rounded-2xl bg-white border border-slate-200 shadow-xs mb-6">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 font-mono uppercase text-left px-2">
                  Tingkat Penyelarasan (N-Back):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { level: 1, label: '1-Langkah', sub: '1-Back (Dasar)' },
                    { level: 2, label: '2-Langkah', sub: '2-Back (Standar)' },
                    { level: 3, label: '3-Langkah', sub: '3-Back (Pakar)' },
                  ].map((item) => (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setNLevel(item.level)}
                      className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer select-none ${
                        nLevel === item.level
                          ? 'bg-cyan-600 text-white font-black shadow-md shadow-cyan-600/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200/60'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div
                        className={`text-[9px] mt-0.5 leading-none ${
                          nLevel === item.level ? 'text-cyan-100' : 'text-slate-400'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <AppButton
                id="start-nback-button"
                label={`MULAI TES ${nLevel}-BACK`}
                icon={<Play className="w-4 h-4 fill-current" />}
                iconPosition="leading"
                variant="primary"
                onClick={() => setIsCountdownOpen(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/15 text-xs sm:text-sm w-full"
              />
            </motion.div>
          )}

          {/* 2. RUNNING PHASE - Clean, Distraction-Free Arena */}
          {phase === 'running' && (
            <motion.div
              key="running-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="max-w-xs sm:max-w-sm w-full flex flex-col items-center gap-4 sm:gap-5 relative z-10"
            >
              {/* Header Running Phase: Label Sub-Mode di Atas & Progress Titik-Titik Horizontal */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex items-center justify-between px-0.5 text-xs font-mono">
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-2xs">
                    MODE {nLevel}-BACK
                  </span>
                  <span className="font-bold text-slate-400">
                    LANGKAH: <strong className="text-slate-900 font-black">{currentIndex + 1} / {TOTAL_TRIALS}</strong>
                  </span>
                </div>

                {/* Progress Level: Titik-titik kecil membentang horizontal */}
                <div className="w-full flex items-center justify-between px-1 py-1">
                  {Array.from({ length: TOTAL_TRIALS }).map((_, idx) => {
                    const isPast = idx < currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                      <div
                        key={idx}
                        className={`rounded-full transition-all duration-200 ${
                          isCurrent
                            ? 'w-2.5 h-2.5 bg-cyan-600 ring-4 ring-cyan-500/25 scale-125 shadow-xs'
                            : isPast
                            ? 'w-1.5 h-1.5 bg-cyan-900'
                            : 'w-1.5 h-1.5 bg-slate-200'
                        }`}
                        title={`Langkah ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Letter Display Arena - Isolated rendering to prevent edge artifacts */}
              <div className="w-full h-52 sm:h-56 rounded-3xl bg-white border border-slate-200 shadow-lg flex flex-col items-center justify-between p-4 relative overflow-hidden [contain:paint_layout] [isolation:isolate]">
                {/* Subtle Ambient Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />

                {/* Stimulus Letter Container */}
                <div className="w-full flex-1 flex items-center justify-center relative select-none [contain:strict] overflow-hidden">
                  {isStimulusVisible && currentIndex >= 0 && sequence[currentIndex] ? (
                    <div
                      key={`stimulus-${currentIndex}-${sequence[currentIndex]}`}
                      className="font-mono font-black text-8xl sm:text-9xl text-slate-900 select-none tracking-normal leading-none inline-block text-center will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
                    >
                      {sequence[currentIndex]}
                    </div>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-slate-300/70 animate-pulse" />
                  )}
                </div>

                {/* Elegant Horizontal Duration Progress Bar */}
                <div className="w-full max-w-[260px] sm:max-w-[290px] px-1 mb-1 z-10">
                  <div className="w-full h-1.5 bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden relative shadow-inner">
                    {isStimulusVisible ? (
                      <div
                        key={`progress-${currentIndex}`}
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full w-full origin-left"
                        style={{
                          animation: `nbackProgress ${STIMULUS_VISIBLE_MS}ms linear forwards`,
                        }}
                      />
                    ) : (
                      <div className="h-full w-0 bg-transparent" />
                    )}
                  </div>
                </div>

                {/* Instant Feedback Indicator Badge */}
                {lastResponseFeedback && (
                  <div
                    className={`absolute bottom-3 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold font-mono tracking-wider animate-in fade-in zoom-in-95 duration-100 z-20 ${
                      lastResponseFeedback === 'hit'
                        ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                        : 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                    }`}
                  >
                    {lastResponseFeedback === 'hit' ? '✓ TARGET COCOK' : '✗ SALAH TEKAN'}
                  </div>
                )}
              </div>

              {/* Primary Match CTA Button */}
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  id="nback-match-trigger-button"
                  type="button"
                  disabled={hasRespondedInTrial}
                  onClick={handleUserMatchPress}
                  className={`w-full h-14 sm:h-16 rounded-2xl font-black text-sm sm:text-base tracking-wide transition-all select-none cursor-pointer flex items-center justify-center gap-2 ${
                    hasRespondedInTrial
                      ? 'bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/25 active:scale-[0.98]'
                  }`}
                >
                  <Target className="w-5 h-5" />
                  <span>{hasRespondedInTrial ? 'TEREKAM' : `TARGET COCOK (${nLevel}-Langkah Lalu)`}</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  Tekan <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px]">Spasi</kbd> / Ketuk Tombol
                </span>
              </div>
            </motion.div>
          )}

          {/* 3. COMPLETED PHASE - Open Canvas Result */}
          {phase === 'completed' && sessionSummary && (
            <GameResultView
              modeTitle="Penyelarasan Memori"
              subModeLabel={`Tes ${nLevel}-Back (${TOTAL_TRIALS} Stimulus)`}
              primaryScore={sessionSummary.accuracy}
              scoreUnit="%"
              isNewRecord={sessionSummary.isNewRecord}
              tierRank={sessionSummary.tierEval.rank}
              tierName={sessionSummary.tierEval.tierName}
              tierCaption={sessionSummary.tierEval.badgeLabel || 'Standar Penyelarasan Memori'}
              tierDescription={sessionSummary.tierEval.desc}
              stats={[
                {
                  id: 'hits',
                  label: 'Hits (Target Tepat)',
                  value: `${sessionSummary.hits} / ${sessionSummary.totalTargets}`,
                  highlight: true,
                },
                {
                  id: 'rejections',
                  label: 'Koreksi Tepat (Non-Target)',
                  value: `${sessionSummary.correctRejections}`,
                },
                {
                  id: 'false_alarms',
                  label: 'Salah Tekan (False Alarm)',
                  value: `${sessionSummary.falseAlarms}`,
                },
                {
                  id: 'misses',
                  label: 'Target Terlewat (Misses)',
                  value: `${sessionSummary.misses}`,
                },
              ]}
              onBackToMenu={onBackToMenu}
              onRetry={handleRestartToPreparation}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Preparation Footer - Only visible during preparation (idle) */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="nback"
          bestRecord={currentBestRecord}
          unit="%"
          subModeLabel={`${nLevel}-Back`}
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
        title="Penyelarasan Memori"
        accentColor="sky"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="nback"
        initialTab={infoTab}
        initialSubMode={currentSubModeKey}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="nback"
        modeTitle="Penyelarasan Memori"
        unit="%"
        initialSubMode={currentSubModeKey}
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
