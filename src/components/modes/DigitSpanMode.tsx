import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getDigitSpanEvaluation, saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import {
  RotateCcw,
  Play,
  CheckCircle2,
  AlertOctagon,
  Binary,
  Delete,
  Sparkles,
  ArrowRight,
  Brain,
  Zap,
} from 'lucide-react';

interface DigitSpanModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type DigitSpanPhase = 'idle' | 'memorize' | 'recall' | 'success_feedback' | 'game_over';

const INITIAL_SPAN_LENGTH = 4;
const DIGIT_DISPLAY_DURATION_MS = 800;
const DIGIT_GAP_DURATION_MS = 200;

export const DigitSpanMode: React.FC<DigitSpanModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [phase, setPhase] = useState<DigitSpanPhase>('idle');
  const [spanLength, setSpanLength] = useState<number>(INITIAL_SPAN_LENGTH);
  const [sequence, setSequence] = useState<number[]>([]);
  const [activeDigitIndex, setActiveDigitIndex] = useState<number>(-1);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [lastCompletedSpan, setLastCompletedSpan] = useState<number>(0);
  const [isNewRecordEarned, setIsNewRecordEarned] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const displayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (displayTimerRef.current) {
      clearTimeout(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const generateDigitSequence = useCallback((length: number): number[] => {
    const seq: number[] = [];
    for (let i = 0; i < length; i++) {
      let nextDigit: number;
      do {
        nextDigit = Math.floor(Math.random() * 10);
      } while (i > 0 && nextDigit === seq[i - 1]);
      seq.push(nextDigit);
    }
    return seq;
  }, []);

  const playSequencePresentation = useCallback(
    (targetSeq: number[]) => {
      clearAllTimers();
      setPhase('memorize');
      setUserInput([]);
      setActiveDigitIndex(-1);

      let currentIndex = 0;

      const showNextDigit = () => {
        if (currentIndex < targetSeq.length) {
          setActiveDigitIndex(currentIndex);
          playTactileClick();

          displayTimerRef.current = setTimeout(() => {
            setActiveDigitIndex(-1);
            currentIndex++;

            displayTimerRef.current = setTimeout(() => {
              showNextDigit();
            }, DIGIT_GAP_DURATION_MS);
          }, DIGIT_DISPLAY_DURATION_MS);
        } else {
          setActiveDigitIndex(-1);
          setPhase('recall');
        }
      };

      displayTimerRef.current = setTimeout(() => {
        showNextDigit();
      }, 400);
    },
    [clearAllTimers]
  );

  const startLevel = useCallback(
    (targetLength: number) => {
      clearAllTimers();
      const newSeq = generateDigitSequence(targetLength);
      setSequence(newSeq);
      playSequencePresentation(newSeq);
    },
    [clearAllTimers, generateDigitSequence, playSequencePresentation]
  );

  const startNewGame = () => {
    clearAllTimers();
    setSpanLength(INITIAL_SPAN_LENGTH);
    setLastCompletedSpan(0);
    setIsNewRecordEarned(false);
    setUserInput([]);
    startLevel(INITIAL_SPAN_LENGTH);
  };

  const evaluateSubmission = (input: number[]) => {
    const isCorrect = input.every((val, idx) => val === sequence[idx]);

    if (isCorrect) {
      playSuccessChime();
      setLastCompletedSpan(spanLength);
      setPhase('success_feedback');

      const nextLength = spanLength + 1;
      setSpanLength(nextLength);

      displayTimerRef.current = setTimeout(() => {
        startLevel(nextLength);
      }, 900);
    } else {
      playErrorBuzz();
      setPhase('game_over');

      const finalScore = lastCompletedSpan;
      const evalData = getDigitSpanEvaluation(finalScore);

      const { isNewBest } = saveBestRecord('digit_span', finalScore);
      setIsNewRecordEarned(isNewBest);

      addHistoryItem({
        mode: 'digit_span',
        primaryMetric: finalScore,
        unit: 'Digit',
        ratingLabel: evalData.tier,
        subMetric: `Panjang Maksimal: ${finalScore} Digit • Urutan: ${sequence.join(' ')} vs Input: ${input.join(' ')}`,
      });
      onRecordUpdated();
    }
  };

  const handleKeypadPress = (digit: number) => {
    if (phase !== 'recall') return;
    if (userInput.length >= sequence.length) return;

    playTactileClick();
    const nextInput = [...userInput, digit];
    setUserInput(nextInput);

    if (nextInput.length === sequence.length) {
      evaluateSubmission(nextInput);
    }
  };

  const handleDelete = () => {
    if (phase !== 'recall' || userInput.length === 0) return;
    playTactileClick();
    setUserInput((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'recall') return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypadPress(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, userInput, sequence]);

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startNewGame();
  };

  const handleRestartToPreparation = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    setSpanLength(INITIAL_SPAN_LENGTH);
    setLastCompletedSpan(0);
    setIsNewRecordEarned(false);
    setUserInput([]);
    setSequence([]);
    setActiveDigitIndex(-1);
    setPhase('idle');
  };

  const handleExitDirectly = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Top HUD - hidden when game_over */}
      {phase !== 'game_over' && (
        <InGameHUD
          title="Ingatan Angka"
          modeIcon={<Binary className="w-4 h-4 text-indigo-500" />}
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
          {/* 1. IDLE - Essential Guide Only */}
          {phase === 'idle' && (
            <motion.div
              key="intro-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full flex flex-col items-center relative z-10 my-auto text-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4 text-indigo-600 shadow-xs">
                <Binary className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                Ingatan Angka
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Hafalkan urutan angka yang muncul satu per satu, lalu ketikkan kembali secara tepat. Panjang deretan angka bertambah tiap berhasil.
              </p>

              <AppButton
                id="start-digit-span-button"
                label="MULAI TES DIGIT SPAN"
                icon={<Play className="w-4 h-4 fill-current" />}
                iconPosition="leading"
                variant="primary"
                onClick={() => setIsCountdownOpen(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/15 text-xs sm:text-sm w-full"
              />
            </motion.div>
          )}

          {/* 2. MEMORIZE PHASE */}
          {phase === 'memorize' && (
            <motion.div
              key="memorize-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="max-w-md w-full flex flex-col items-center gap-5 relative z-10"
            >
              {/* Top Context & Progress Header (Replaces Footer) */}
              <div className="w-full flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">
                    Level {spanLength - INITIAL_SPAN_LENGTH + 1}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    • {spanLength} Digit
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {bestRecord !== null && (
                    <span className="text-[11px] font-mono font-medium text-slate-500 hidden sm:inline">
                      Rekor: <strong className="text-slate-800 font-bold">{bestRecord} Digit</strong>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    <span>Hafalkan Angka</span>
                  </span>
                </div>
              </div>

              {/* Seamless Stimulus Canvas */}
              <div className="w-full h-52 sm:h-60 rounded-3xl bg-gradient-to-b from-indigo-50/70 via-white to-indigo-50/30 border border-indigo-200/80 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeDigitIndex >= 0 && activeDigitIndex < sequence.length ? (
                    <motion.div
                      key={`digit-${activeDigitIndex}-${sequence[activeDigitIndex]}`}
                      initial={{ scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.15, opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="font-mono font-black text-8xl sm:text-9xl text-slate-900 select-none tracking-tight drop-shadow-xs"
                    >
                      {sequence[activeDigitIndex]}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="focal-dot"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="w-4 h-4 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 animate-pulse"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Sequential Rhythm Stepper Dots */}
              <div className="flex items-center gap-2 flex-wrap justify-center px-4 pt-1">
                {sequence.map((_, idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      scale: idx === activeDigitIndex ? 1.4 : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      idx === activeDigitIndex
                        ? 'w-6 bg-indigo-600 shadow-xs shadow-indigo-600/50'
                        : idx < activeDigitIndex
                        ? 'w-2 bg-indigo-300'
                        : 'w-2 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* 3. RECALL PHASE */}
          {phase === 'recall' && (
            <motion.div
              key="recall-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full flex flex-col items-center gap-4 relative z-10"
            >
              {/* Top Context & Progress Header (Replaces Footer) */}
              <div className="w-full flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">
                    Level {spanLength - INITIAL_SPAN_LENGTH + 1}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    • {spanLength} Digit
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {bestRecord !== null && (
                    <span className="text-[11px] font-mono font-medium text-slate-500 hidden sm:inline">
                      Rekor: <strong className="text-slate-800 font-bold">{bestRecord} Digit</strong>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>Giliran Anda</span>
                  </span>
                </div>
              </div>

              {/* Digit Display Cells Stage */}
              <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-indigo-50/40 via-white to-slate-50 border border-indigo-200/80 shadow-sm flex items-center justify-center gap-2 sm:gap-2.5 min-h-[80px] overflow-x-auto">
                {Array.from({ length: spanLength }).map((_, idx) => {
                  const val = userInput[idx];
                  const isFilled = val !== undefined;
                  const isCurrent = idx === userInput.length;

                  return (
                    <motion.div
                      key={idx}
                      animate={{
                        scale: isCurrent ? 1.06 : 1,
                      }}
                      className={`w-10 h-13 sm:w-11 sm:h-14 rounded-2xl border flex items-center justify-center font-mono font-black text-2xl select-none transition-all duration-150 ${
                        isFilled
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : isCurrent
                          ? 'bg-indigo-50/80 text-indigo-700 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs'
                          : 'bg-white text-slate-300 border-slate-200/90'
                      }`}
                    >
                      {isFilled ? val : ''}
                    </motion.div>
                  );
                })}
              </div>

              {/* Ergonomic Numpad Dock (3 Columns, Perfect Touch Target) */}
              <div className="w-full max-w-sm grid grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="min-h-[58px] sm:min-h-[64px] rounded-2xl bg-white hover:bg-indigo-50/60 active:bg-indigo-100 border border-slate-200 hover:border-indigo-200 font-mono font-black text-2xl text-slate-800 shadow-xs cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center select-none"
                  >
                    {num}
                  </button>
                ))}

                {/* Delete / Backspace Action */}
                <button
                  type="button"
                  aria-label="Hapus Digit Terakhir"
                  onClick={handleDelete}
                  disabled={userInput.length === 0}
                  className="min-h-[58px] sm:min-h-[64px] rounded-2xl bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 border border-slate-200 flex flex-col items-center justify-center text-slate-700 cursor-pointer transition-all active:scale-[0.97] select-none"
                >
                  <Delete className="w-5 h-5 text-slate-700" />
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">HAPUS</span>
                </button>

                {/* 0 Key */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress(0)}
                  className="min-h-[58px] sm:min-h-[64px] rounded-2xl bg-white hover:bg-indigo-50/60 active:bg-indigo-100 border border-slate-200 hover:border-indigo-200 font-mono font-black text-2xl text-slate-800 shadow-xs cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center select-none"
                >
                  0
                </button>

                {/* Progress / Completion Status Box */}
                <div className="min-h-[58px] sm:min-h-[64px] rounded-2xl bg-slate-50/90 border border-slate-200/70 flex flex-col items-center justify-center text-center select-none">
                  <span className="text-xs font-mono font-black text-slate-700">
                    {userInput.length} / {spanLength}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    TERISI
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. SUCCESS FEEDBACK */}
          {phase === 'success_feedback' && (
            <motion.div
              key="success-view"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="max-w-xs w-full p-6 rounded-3xl bg-white border border-emerald-200 shadow-lg flex flex-col items-center text-center relative z-10"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                Tepat Sekali!
              </h3>
              <p className="text-xs text-slate-600 font-medium mb-3">
                Lolos {lastCompletedSpan} Digit. Menyiapkan tantangan {spanLength} Digit...
              </p>
            </motion.div>
          )}

          {/* 5. GAME OVER SCREEN */}
          {phase === 'game_over' && (
            (() => {
              const tierEval = evaluateScoreTier('digit_span', lastCompletedSpan);
              const isNewRec = isNewRecordEarned || (bestRecord !== null && lastCompletedSpan > bestRecord);
              return (
                <GameResultView
                  modeTitle="Ingatan Angka"
                  subModeLabel="Digit Span Test (Forward Recall)"
                  primaryScore={lastCompletedSpan}
                  scoreUnit="Digit"
                  isNewRecord={isNewRec}
                  tierRank={tierEval.rank}
                  tierName={tierEval.tierName}
                  tierCaption={tierEval.badgeLabel || 'Standar Ingatan Angka'}
                  tierDescription={tierEval.desc}
                  stats={[
                    {
                      id: 'correct_seq',
                      label: 'Urutan Benar',
                      value: sequence.join(' '),
                      highlight: true,
                    },
                    {
                      id: 'user_input',
                      label: 'Input Terakhir Anda',
                      value: userInput.join(' '),
                    },
                    {
                      id: 'level_achieved',
                      label: 'Tingkat Tercapai',
                      value: `Level ${lastCompletedSpan - INITIAL_SPAN_LENGTH + 1}`,
                    },
                  ]}
                  onBackToMenu={onBackToMenu}
                  onRetry={handleRestartToPreparation}
                />
              );
            })()
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Preparation Footer (Shown ONLY in IDLE state) */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="digit_span"
          bestRecord={bestRecord}
          unit="Digit"
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
        title="Ingatan Angka"
        accentColor="indigo"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="digit_span"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="digit_span"
        modeTitle="Ingatan Angka"
        unit="Digit"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
