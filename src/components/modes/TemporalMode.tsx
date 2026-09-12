import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReflexMode, TemporalRoundResult } from '../../types';
import { playTactileClick, playSuccessChime, playErrorBuzz } from '../../utils/audio';
import { saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { InGameRoundsFooter } from '../common/InGameRoundsFooter';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { Timer, Play, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TemporalModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

// 5 rounds targets sequence: 2s, 3s, 5s, 7s, 4s
const ROUND_TARGETS_MS = [2000, 3000, 5000, 7000, 4000];
const TOTAL_ROUNDS = ROUND_TARGETS_MS.length;
const MIN_VALID_HOLD_MS = 200; // Release before 200ms is considered an accidental slip

type TemporalState = 'idle' | 'ready_to_hold' | 'holding' | 'round_result' | 'completed';

export const TemporalMode: React.FC<TemporalModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [state, setState] = useState<TemporalState>('idle');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundResults, setRoundResults] = useState<TemporalRoundResult[]>([]);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  const [isEarlyRelease, setIsEarlyRelease] = useState<boolean>(false);
  const [isNewRecordEarned, setIsNewRecordEarned] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // Timing references
  const pressStartTimeRef = useRef<number | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const stateRef = useRef<TemporalState>(state);
  const currentRoundRef = useRef<number>(currentRound);
  const roundResultsRef = useRef<TemporalRoundResult[]>(roundResults);

  // Keep refs synchronized
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  useEffect(() => {
    roundResultsRef.current = roundResults;
  }, [roundResults]);

  const targetDurationMs = ROUND_TARGETS_MS[currentRound - 1] || 2000;

  const handleStartCountdown = () => {
    setIsCountdownOpen(true);
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    setCurrentRound(1);
    setRoundResults([]);
    setIsEarlyRelease(false);
    setIsNewRecordEarned(false);
    setState('ready_to_hold');
  };

  const handleRestartToPreparation = () => {
    isHoldingRef.current = false;
    pressStartTimeRef.current = null;
    setIsCountdownOpen(false);
    setState('idle');
    setCurrentRound(1);
    setRoundResults([]);
    setIsEarlyRelease(false);
    setIsNewRecordEarned(false);
  };

  const handlePressStart = useCallback(() => {
    if (stateRef.current !== 'ready_to_hold') return;
    playTactileClick();
    isHoldingRef.current = true;
    pressStartTimeRef.current = performance.now();
    setIsEarlyRelease(false);
    setState('holding');
  }, []);

  const handlePressEnd = useCallback(() => {
    if (!isHoldingRef.current || pressStartTimeRef.current === null) return;
    isHoldingRef.current = false;

    const pressEndTime = performance.now();
    const actualDurationMs = Math.round(pressEndTime - pressStartTimeRef.current);
    pressStartTimeRef.current = null;

    // Accidental early release check (< 150ms)
    if (actualDurationMs < 150) {
      playErrorBuzz();
      setIsEarlyRelease(true);
      setState('ready_to_hold');
      return;
    }

    const currentRnd = currentRoundRef.current;
    const currentTargetMs = ROUND_TARGETS_MS[currentRnd - 1] || 2000;

    // Valid round submission
    const signedDeviationMs = actualDurationMs - currentTargetMs;
    const deviationMs = Math.abs(signedDeviationMs);

    const roundData: TemporalRoundResult = {
      roundNumber: currentRnd,
      targetDurationMs: currentTargetMs,
      actualDurationMs,
      deviationMs,
      signedDeviationMs,
    };

    const updatedResults = [...roundResultsRef.current, roundData];
    setRoundResults(updatedResults);

    // Provide auditory feedback
    if (deviationMs <= 150) {
      playSuccessChime();
    } else {
      playTactileClick();
    }

    if (currentRnd >= TOTAL_ROUNDS) {
      // Calculate overall Mean Absolute Deviation (MAD)
      const totalDeviation = updatedResults.reduce((sum, r) => sum + r.deviationMs, 0);
      const meanAbsoluteDeviation = Math.round(totalDeviation / TOTAL_ROUNDS);

      const recordRes = saveBestRecord('temporal', meanAbsoluteDeviation);
      setIsNewRecordEarned(recordRes.isNewBest);

      const evaluation = evaluateScoreTier('temporal', meanAbsoluteDeviation);
      addHistoryItem({
        mode: 'temporal',
        primaryMetric: meanAbsoluteDeviation,
        unit: 'ms',
        ratingLabel: evaluation.badgeLabel || evaluation.tierName,
        subMetric: `MAD: ${meanAbsoluteDeviation}ms • 5 Ronde: ${updatedResults.map((r) => `${r.deviationMs}ms`).join(', ')}`,
      });

      onRecordUpdated();
      setState('completed');
    } else {
      setState('round_result');
    }
  }, [onRecordUpdated]);

  // Global window release fallback: guarantees release is captured even if pointer leaves button or screen
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isHoldingRef.current) {
        handlePressEnd();
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, [handlePressEnd]);

  // Keyboard Spacebar listener for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (stateRef.current === 'ready_to_hold') {
          e.preventDefault();
          handlePressStart();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isHoldingRef.current) {
          e.preventDefault();
          handlePressEnd();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePressStart, handlePressEnd]);

  const handleNextRound = () => {
    playTactileClick();
    setCurrentRound((prev) => prev + 1);
    setIsEarlyRelease(false);
    setState('ready_to_hold');
  };

  // Mean Absolute Deviation computation
  const currentMAD =
    roundResults.length > 0
      ? Math.round(roundResults.reduce((sum, r) => sum + r.deviationMs, 0) / roundResults.length)
      : null;

  const currentRoundData = roundResults[currentRound - 1];

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      {/* Universal Top HUD - hidden when final result is shown */}
      {state !== 'completed' && (
        <InGameHUD
          title="Estimasi Waktu"
          modeIcon={<Timer className="w-5 h-5 text-emerald-600" />}
          isGameActive={state !== 'idle' || isCountdownOpen}
          onExit={onBackToMenu}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Main Interactive Stage */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* 1. IDLE / PREPARATION STATE */}
        {state === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-600 shadow-xs">
              <Timer className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Estimasi Waktu
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Uji ketepatan jam internal otak Anda. Tekan dan tahan tombol, lalu lepaskan tepat saat Anda memperkirakan target waktu tercapai tanpa bantuan penunjuk visual.
            </p>

            <div className="w-full grid grid-cols-5 gap-1.5 p-2 rounded-2xl bg-white border border-slate-200 shadow-xs mb-6 text-center">
              {ROUND_TARGETS_MS.map((target, idx) => (
                <div key={idx} className="py-2 px-1 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">R{idx + 1}</div>
                  <div className="text-xs font-black text-slate-800 font-mono">{(target / 1000).toFixed(1)}s</div>
                </div>
              ))}
            </div>

            <AppButton
              id="start-temporal-test-button"
              label="MULAI 5 RONDE"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={handleStartCountdown}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </div>
        )}

        {/* 2 & 3. READY TO HOLD & HOLDING (BLIND TIMING) STATE */}
        {(state === 'ready_to_hold' || state === 'holding') && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Timer className="w-3.5 h-3.5" />
              <span>Ronde {currentRound} dari {TOTAL_ROUNDS}</span>
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Target Durasi
            </div>
            <div className="text-5xl sm:text-6xl font-black font-mono text-slate-900 mb-6 tracking-tight">
              {(targetDurationMs / 1000).toFixed(2)} <span className="text-xl font-sans text-slate-500 font-normal">detik</span>
            </div>

            {isEarlyRelease && state === 'ready_to_hold' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-4 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Terlalu cepat dilepas! Tahan tombol hingga estimasi tercapai.</span>
              </div>
            )}

            <div className="relative flex items-center justify-center my-2">
              <button
                id="temporal-hold-button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch (err) {}
                  handlePressStart();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  try {
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  } catch (err) {}
                  handlePressEnd();
                }}
                onPointerCancel={(e) => {
                  e.preventDefault();
                  handlePressEnd();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePressStart();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handlePressEnd();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handlePressStart();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handlePressEnd();
                }}
                className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center transition-all duration-150 select-none cursor-pointer touch-none ${
                  state === 'holding'
                    ? 'bg-emerald-600 text-white shadow-2xl scale-100'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/30 active:scale-95'
                }`}
              >
                {state === 'holding' ? (
                  <>
                    <span className="text-xl sm:text-2xl font-black tracking-wider text-white">SEDANG BERJALAN</span>
                    <span className="text-xs text-emerald-100 mt-1 font-medium">Perkirakan dalam benak</span>
                    <span className="text-xs font-bold text-emerald-100 mt-2.5 uppercase tracking-wide px-3 py-1 rounded-full bg-emerald-700/70 border border-emerald-500/40">
                      LEPAS SAAT PAS!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg sm:text-xl font-black tracking-wide">TEKAN & TAHAN</span>
                    <span className="text-[11px] sm:text-xs text-slate-300 mt-1 font-medium">Lepas saat durasi tepat</span>
                    <span className="text-[10px] text-slate-400 mt-2 hidden sm:inline">(Atau tahan Spasi)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4 max-w-xs">
              {state === 'holding'
                ? 'Angka waktu disembunyikan untuk menguji jam biologis internal.'
                : 'Tahan tombol dengan mouse, sentuhan layar, atau tombol Spasi.'}
            </p>
          </div>
        )}

        {/* 4. ROUND RESULT STATE */}
        {state === 'round_result' && currentRoundData && (
          <div className="max-w-md w-full text-center relative z-10 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-3">
              Ronde {currentRound} Selesai
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Deviasi Durasi
            </div>
            <div className="text-5xl font-black font-mono text-slate-900 my-2 tracking-tight">
              {currentRoundData.deviationMs}{' '}
              <span className="text-lg font-sans font-normal text-slate-500">ms</span>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold mb-6">
              <span className="text-slate-500">
                Target: <strong className="text-slate-800">{(currentRoundData.targetDurationMs / 1000).toFixed(2)}s</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Hasil: <strong className="text-slate-800">{(currentRoundData.actualDurationMs / 1000).toFixed(2)}s</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className={currentRoundData.signedDeviationMs > 0 ? 'text-amber-600 font-bold' : 'text-sky-600 font-bold'}>
                {currentRoundData.signedDeviationMs > 0 ? `+${currentRoundData.signedDeviationMs} ms (Lambat)` : `${currentRoundData.signedDeviationMs} ms (Cepat)`}
              </span>
            </div>

            <AppButton
              id="next-temporal-round-button"
              label={`Lanjut ke Ronde ${currentRound + 1}`}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="trailing"
              variant="primary"
              onClick={handleNextRound}
              className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-6 py-3 rounded-2xl text-xs w-full"
            />
          </div>
        )}

        {/* 5. COMPLETED / FINAL RESULT STATE */}
        {state === 'completed' && currentMAD !== null && (
          (() => {
            const tierEval = evaluateScoreTier('temporal', currentMAD);
            const bestDeviation = Math.min(...roundResults.map((r) => r.deviationMs));
            const worstDeviation = Math.max(...roundResults.map((r) => r.deviationMs));
            const avgAccuracy = Math.max(0, Math.round((1 - currentMAD / 4000) * 100));

            return (
              <GameResultView
                modeTitle="Estimasi Waktu"
                subModeLabel="Internal Chronometry & Biological Clock (5 Ronde)"
                primaryScore={currentMAD}
                scoreUnit="ms"
                isNewRecord={isNewRecordEarned}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Estimasi Waktu'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'mad',
                    label: 'Rerata Deviasi Absolut (MAD)',
                    value: `${currentMAD} ms`,
                    highlight: true,
                  },
                  {
                    id: 'best_round',
                    label: 'Deviasi Terbaik',
                    value: `${bestDeviation} ms`,
                  },
                  {
                    id: 'worst_round',
                    label: 'Deviasi Terjauh',
                    value: `${worstDeviation} ms`,
                  },
                  {
                    id: 'acc',
                    label: 'Akurasi Kronometrik',
                    value: `${avgAccuracy}%`,
                  },
                ]}
                onBackToMenu={onBackToMenu}
                onRetry={handleRestartToPreparation}
              />
            );
          })()
        )}
      </main>

      {/* Floating Bottom Footer: Preparation */}
      {state === 'idle' && (
        <ModePreparationFooter
          mode="temporal"
          bestRecord={bestRecord}
          unit="ms"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Floating Bottom Footer: In-Game Round Scores */}
      {state !== 'idle' && state !== 'completed' && (
        <InGameRoundsFooter
          totalRounds={TOTAL_ROUNDS}
          currentRound={currentRound}
          roundsScores={roundResults.map((r) => r.deviationMs)}
          accentColor="emerald"
          unit="ms"
        />
      )}

      {/* Universal Countdown Overlay */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        modeTitle="Estimasi Waktu"
        modeIcon={<Timer className="w-5 h-5 text-emerald-600" />}
      />

      {/* Modals */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="temporal"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="temporal"
        modeTitle="Estimasi Waktu"
        unit="ms"
        onRecordCleared={() => {
          onRecordUpdated();
          setIsRecordOpen(false);
        }}
      />
    </div>
  );
};
