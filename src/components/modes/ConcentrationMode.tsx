import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneralTestState } from '../../types';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getConcentrationEvaluation, saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { RotateCcw, Play, CheckCircle2, AlertTriangle, Zap, ArrowRight } from 'lucide-react';

interface ConcentrationModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type StimulusType = 'target' | 'distractor'; // target: Go, distractor: No-Go (Trap)

const TOTAL_VALID_STAGES = 5;
const WAITING_PENALTY_MS = 1000;
const TRAP_PENALTY_MS = 1000;

export const ConcentrationMode: React.FC<ConcentrationModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [state, setState] = useState<GeneralTestState>('idle');
  const [validStage, setValidStage] = useState<number>(0);
  const [stimulusType, setStimulusType] = useState<StimulusType>('target');
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [inhibitionsCount, setInhibitionsCount] = useState<number>(0);
  const [penaltyCount, setPenaltyCount] = useState<number>(0);
  const [totalPenaltyTime, setTotalPenaltyTime] = useState<number>(0);
  const [penaltyReason, setPenaltyReason] = useState<string>('');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [inhibitionSuccessNotice, setInhibitionSuccessNotice] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const distractorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (distractorTimeoutRef.current) {
      clearTimeout(distractorTimeoutRef.current);
      distractorTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const scheduleNextStimulus = useCallback(() => {
    clearAllTimers();
    setState('waiting');

    // Jeda acak 3000ms - 7000ms
    const delay = Math.floor(Math.random() * 4000) + 3000;

    timerRef.current = setTimeout(() => {
      // 35% chance distractor (No-Go trap)
      const isDistractor = Math.random() < 0.35;

      if (isDistractor) {
        setStimulusType('distractor');
        setState('ready');

        // Trap duration 1.5s
        distractorTimeoutRef.current = setTimeout(() => {
          playSuccessChime();
          setInhibitionsCount((prev) => prev + 1);
          setInhibitionSuccessNotice(true);
          setTimeout(() => setInhibitionSuccessNotice(false), 1200);

          scheduleNextStimulus();
        }, 1500);
      } else {
        setStimulusType('target');
        startTimeRef.current = performance.now();
        setState('ready');
      }
    }, delay);
  }, [clearAllTimers]);

  const startNewTest = () => {
    clearAllTimers();
    playTactileClick();
    setValidStage(0);
    setReactionTimes([]);
    setInhibitionsCount(0);
    setPenaltyCount(0);
    setTotalPenaltyTime(0);
    setIsFinished(false);
    setInhibitionSuccessNotice(false);

    scheduleNextStimulus();
  };

  const handleContainerClick = () => {
    if (state === 'waiting') {
      clearAllTimers();
      playErrorBuzz();
      setPenaltyCount((prev) => prev + 1);
      setTotalPenaltyTime((prev) => prev + WAITING_PENALTY_MS);
      setPenaltyReason('Prematur! Mengetuk sebelum stimulus muncul.');
      setState('penalty');
    } else if (state === 'ready') {
      if (stimulusType === 'distractor') {
        clearAllTimers();
        playErrorBuzz();
        setPenaltyCount((prev) => prev + 1);
        setTotalPenaltyTime((prev) => prev + TRAP_PENALTY_MS);
        setPenaltyReason('Terjebak! Mengetuk pada stimulus No-Go (Merah).');
        setState('penalty');
      } else {
        const endTime = performance.now();
        const reactionMs = Math.round(endTime - startTimeRef.current);
        clearAllTimers();
        playSuccessChime();

        const updatedTimes = [...reactionTimes, reactionMs];
        setReactionTimes(updatedTimes);
        const newStage = validStage + 1;
        setValidStage(newStage);

        if (newStage >= TOTAL_VALID_STAGES) {
          setIsFinished(true);
          setState('completed');

          const rawSum = updatedTimes.reduce((a, b) => a + b, 0);
          const finalAvgScore = Math.round((rawSum + totalPenaltyTime) / TOTAL_VALID_STAGES);
          const evalData = getConcentrationEvaluation(finalAvgScore);

          saveBestRecord('concentration', finalAvgScore);
          addHistoryItem({
            mode: 'concentration',
            primaryMetric: finalAvgScore,
            unit: 'ms',
            ratingLabel: evalData.tier,
            subMetric: `Murni: ${Math.round(rawSum / TOTAL_VALID_STAGES)}ms | Penalti: +${totalPenaltyTime}ms | Sukses Tahan: ${inhibitionsCount}x`,
          });
          onRecordUpdated();
        } else {
          setState('completed');
        }
      }
    }
  };

  const handleProceedNext = () => {
    scheduleNextStimulus();
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startNewTest();
  };

  const handleRestartToPreparation = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    setValidStage(0);
    setReactionTimes([]);
    setInhibitionsCount(0);
    setPenaltyCount(0);
    setTotalPenaltyTime(0);
    setIsFinished(false);
    setInhibitionSuccessNotice(false);
    setState('idle');
  };

  const handleExitDirectly = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  const latestScore = reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : null;
  const currentAvgScore =
    reactionTimes.length > 0
      ? Math.round(
          (reactionTimes.reduce((a, b) => a + b, 0) + totalPenaltyTime) / reactionTimes.length
        )
      : null;

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Header - hidden when test completed */}
      {!(state === 'completed' && isFinished) && (
        <InGameHUD
          title="Tantangan Konsentrasi"
          modeIcon={<Zap className="w-4 h-4 text-violet-500" />}
          isGameActive={state !== 'idle' || isCountdownOpen}
          onExit={handleExitDirectly}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Main Focus Arena (Edge-to-edge from top to bottom) */}
      <main
        id="concentration-trigger-zone"
        role="button"
        tabIndex={0}
        onClick={handleContainerClick}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            handleContainerClick();
          }
        }}
        className={`w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 transition-colors duration-150 relative cursor-pointer overflow-y-auto ${
          state === 'idle'
            ? 'bg-slate-100 text-slate-900'
            : state === 'waiting'
            ? 'bg-slate-900 text-slate-100'
            : state === 'ready' && stimulusType === 'target'
            ? 'bg-emerald-500 text-slate-950'
            : state === 'ready' && stimulusType === 'distractor'
            ? 'bg-rose-600 text-white'
            : state === 'penalty'
            ? 'bg-rose-100 text-rose-950'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Successful Inhibition Notice */}
        {inhibitionSuccessNotice && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-2xl bg-emerald-600 text-white font-mono text-xs font-black shadow-xl animate-bounce z-40">
            ✓ HEBAT! BERHASIL MENAHAN JEBAKAN!
          </div>
        )}

        {/* State: IDLE - Essential Guide Only */}
        {state === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4 text-violet-600 shadow-xs">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Tantangan Konsentrasi
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Ketuk secepat mungkin hanya jika warna <strong className="text-emerald-600 font-bold">HIJAU</strong> muncul. Tahan jari Anda dan jangan sentuh jika warna <strong className="text-rose-600 font-bold">MERAH (JEBAKAN)</strong> muncul!
            </p>

            <AppButton
              id="start-concentration-test-button"
              label="MULAI PENGUJIAN"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                setIsCountdownOpen(true);
              }}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </div>
        )}

        {/* State: WAITING */}
        {state === 'waiting' && (
          <div className="text-center relative z-10 select-none pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Zap className="w-5 h-5 text-violet-400 opacity-60" />
            </div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Konsentrasi Penuh...
            </p>
          </div>
        )}

        {/* State: READY (Target: Green / Distractor: Red) */}
        {state === 'ready' && stimulusType === 'target' && (
          <div className="text-center relative z-10 animate-in zoom-in-95 duration-75">
            <div className="w-24 h-24 rounded-full bg-slate-950 flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
              <span className="text-emerald-400 font-black text-2xl font-mono">GO!</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tighter">
              KETUK SEKARANG!
            </h1>
          </div>
        )}

        {state === 'ready' && stimulusType === 'distractor' && (
          <div className="text-center relative z-10 animate-in zoom-in-95 duration-75">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-2xl animate-pulse">
              <span className="text-rose-600 font-black text-xl font-mono">STOP!</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
              JANGAN SENTUH!
            </h1>
          </div>
        )}

        {/* State: PENALTY */}
        {state === 'penalty' && (
          <div className="max-w-md w-full text-center relative z-10 p-6 rounded-3xl bg-white border border-rose-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              Pelanggaran Aturan!
            </h2>
            <p className="text-xs text-slate-600 mb-3">{penaltyReason}</p>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-mono text-xs font-bold mb-5 border border-rose-200">
              Total Penalti: +{totalPenaltyTime}ms ({penaltyCount}x)
            </div>
            <AppButton
              id="retry-concentration-round-button"
              label="Lanjutkan Sesi"
              icon={<RotateCcw className="w-4 h-4" />}
              iconPosition="leading"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                scheduleNextStimulus();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700 font-black px-6 py-3 rounded-2xl border-none shadow-lg text-xs w-full"
            />
          </div>
        )}

        {/* State: COMPLETED */}
        {state === 'completed' && (
          <>
            {isFinished ? (
              (() => {
                const finalAvg = currentAvgScore || 0;
                const tierEval = evaluateScoreTier('concentration', finalAvg);
                const isNewRec = bestRecord !== null && finalAvg > 0 ? finalAvg < bestRecord : false;
                return (
                  <GameResultView
                    modeTitle="Tes Konsentrasi"
                    subModeLabel="Go / No-Go (5 Target)"
                    primaryScore={finalAvg}
                    scoreUnit="ms"
                    isNewRecord={isNewRec}
                    tierRank={tierEval.rank}
                    tierName={tierEval.tierName}
                    tierCaption={tierEval.badgeLabel || 'Standar Tes Konsentrasi'}
                    tierDescription={tierEval.desc}
                    stats={[
                      {
                        id: 'inhibitions',
                        label: 'Sukses Tahan Jebakan',
                        value: `${inhibitionsCount} Kali`,
                        highlight: true,
                      },
                      {
                        id: 'fastest',
                        label: 'Respon Tercepat',
                        value: `${reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0} ms`,
                      },
                      {
                        id: 'penalties',
                        label: 'Total Penalti',
                        value: `+${totalPenaltyTime} ms (${penaltyCount}x)`,
                      },
                    ]}
                    onBackToMenu={onBackToMenu}
                    onRetry={handleRestartToPreparation}
                  />
                );
              })()
            ) : (
              <div className="max-w-md w-full text-center relative z-10 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target {validStage} dari {TOTAL_VALID_STAGES}
                </span>
                <div className="text-5xl font-black font-mono text-slate-900 my-3 tracking-tight">
                  {latestScore} <span className="text-lg font-sans font-normal text-slate-500">ms</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Fokus terjaga dengan baik. Lanjutkan ke stimulus berikutnya!
                </p>
                <AppButton
                  id="next-concentration-stage-button"
                  label={`Lanjut ke Target ${validStage + 1}`}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="trailing"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProceedNext();
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-6 py-3 rounded-2xl text-xs w-full"
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Status Panel - hidden when test completed */}
      {state === 'idle' && (
        <ModePreparationFooter
          mode="concentration"
          bestRecord={bestRecord}
          unit="ms"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}
      {/* In-Game Floating Concentration Status Dock */}
      {state !== 'idle' && !(state === 'completed' && isFinished) && (
        <footer className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md mx-auto rounded-2xl bg-white/85 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm py-2.5 px-4 flex items-center justify-between font-mono text-xs transition-all">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-sans text-[11px] font-semibold">TARGET:</span>
              <strong className="text-slate-900 font-black">{validStage} / {TOTAL_VALID_STAGES}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-sans text-[11px] font-semibold">TAHAN JEBAKAN:</span>
              <strong className="text-emerald-600 font-black">{inhibitionsCount}x</strong>
            </div>
          </div>
        </footer>
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Tantangan Konsentrasi"
        accentColor="violet"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="concentration"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="concentration"
        modeTitle="Tes Konsentrasi"
        unit="ms"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
