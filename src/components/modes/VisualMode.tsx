import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneralTestState } from '../../types';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getReactionEvaluation, saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { InGameRoundsFooter } from '../common/InGameRoundsFooter';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { RotateCcw, Play, CheckCircle2, AlertTriangle, Eye, ArrowRight, Trophy } from 'lucide-react';

interface VisualModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

const TOTAL_ROUNDS = 5;
const PENALTY_TIME_MS = 1000;

export const VisualMode: React.FC<VisualModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [state, setState] = useState<GeneralTestState>('idle');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsScores, setRoundsScores] = useState<number[]>([]);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [isTestFinished, setIsTestFinished] = useState<boolean>(false);
  const [penaltyCount, setPenaltyCount] = useState<number>(0);
  const [totalPenaltyTime, setTotalPenaltyTime] = useState<number>(0);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

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

  const startRound = useCallback(() => {
    clearTimer();
    playTactileClick();
    setState('waiting');

    // Random unpredictable delay: 3000ms - 8000ms
    const delay = Math.floor(Math.random() * 5000) + 3000;

    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setState('ready');
    }, delay);
  }, [clearTimer]);

  const handleContainerClick = () => {
    if (state === 'waiting') {
      clearTimer();
      playErrorBuzz();
      setPenaltyCount((prev) => prev + 1);
      setTotalPenaltyTime((prev) => prev + PENALTY_TIME_MS);
      setState('penalty');
    } else if (state === 'ready') {
      const endTime = performance.now();
      const rawReaction = Math.round(endTime - startTimeRef.current);
      clearTimer();
      playSuccessChime();
      setLatestScore(rawReaction);

      const updatedScores = [...roundsScores, rawReaction];
      setRoundsScores(updatedScores);

      if (currentRound >= TOTAL_ROUNDS) {
        setIsTestFinished(true);
        setState('completed');

        const rawSum = updatedScores.reduce((acc, val) => acc + val, 0);
        const finalAvgScore = Math.round((rawSum + totalPenaltyTime) / TOTAL_ROUNDS);
        const evalData = getReactionEvaluation(finalAvgScore);

        saveBestRecord('visual', finalAvgScore);
        addHistoryItem({
          mode: 'visual',
          primaryMetric: finalAvgScore,
          unit: 'ms',
          ratingLabel: evalData.tier,
          subMetric: `Murni: ${Math.round(rawSum / TOTAL_ROUNDS)}ms • Penalti: +${totalPenaltyTime}ms (${penaltyCount}x) • Tercepat: ${Math.min(...updatedScores)}ms`,
        });
        onRecordUpdated();
      } else {
        setState('completed');
      }
    }
  };

  const handleNextRound = () => {
    setCurrentRound((prev) => prev + 1);
    startRound();
  };

  const resetFullTest = () => {
    clearTimer();
    setCurrentRound(1);
    setRoundsScores([]);
    setLatestScore(null);
    setIsTestFinished(false);
    setPenaltyCount(0);
    setTotalPenaltyTime(0);
    setState('idle');
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startRound();
  };

  const handleRestartToPreparation = () => {
    clearTimer();
    setIsCountdownOpen(false);
    resetFullTest();
  };

  const handleExitDirectly = () => {
    clearTimer();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  const currentAvgScore =
    roundsScores.length > 0
      ? Math.round(
          (roundsScores.reduce((a, b) => a + b, 0) + totalPenaltyTime) / roundsScores.length
        )
      : null;

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Header - hidden when full test completed */}
      {!(state === 'completed' && isTestFinished) && (
        <InGameHUD
          title="Reaksi Visual"
          modeIcon={<Eye className="w-4 h-4 text-rose-500" />}
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

      {/* Fullscreen Interactive Canvas (Edge-to-edge from top to bottom) */}
      <main
        id="visual-reaction-trigger-zone"
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
            ? 'bg-rose-50 text-rose-950'
            : state === 'ready'
            ? 'bg-emerald-500 text-slate-950'
            : state === 'penalty'
            ? 'bg-rose-100 text-rose-950'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* State: IDLE - Clean & Essential Guide only */}
        {state === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600 shadow-xs">
              <Eye className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Refleks Visual
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Saat layar berubah menjadi <strong className="text-emerald-600 font-bold">HIJAU</strong>, sentuh layar secepat mungkin. Mode ini <strong className="text-rose-600 font-bold">100% hening tanpa suara</strong> dengan jeda acak.
            </p>

            <AppButton
              id="start-visual-test-button"
              label="MULAI 5 RONDE"
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
          <div className="text-center relative z-10 animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-full bg-rose-200/60 border border-rose-300 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-rose-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
              Tunggu Warna Hijau...
            </h2>
            <p className="text-xs sm:text-sm text-rose-700 mt-2 font-medium">
              Jeda acak 3 - 8 detik. Jangan sentuh sebelum layar hijau!
            </p>
          </div>
        )}

        {/* State: READY */}
        {state === 'ready' && (
          <div className="text-center relative z-10 animate-in zoom-in-95 duration-75">
            <div className="w-24 h-24 rounded-full bg-slate-950 flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
              <span className="text-emerald-400 font-black text-2xl font-mono">KLIK!</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tighter">
              SENTUH SEKARANG!
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
              Terlalu Cepat (False Start)!
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Anda menyentuh layar sebelum warna hijau muncul. Dikenakan penalti <strong className="text-rose-600">+{PENALTY_TIME_MS}ms</strong>.
            </p>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-mono text-xs font-bold mb-5 border border-rose-200">
              Total Penalti: +{totalPenaltyTime}ms ({penaltyCount}x)
            </div>
            <AppButton
              id="retry-after-penalty-button"
              label="Ulangi Ronde Ini"
              icon={<RotateCcw className="w-4 h-4" />}
              iconPosition="leading"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                startRound();
              }}
              className="bg-rose-600 text-white hover:bg-rose-700 font-black px-6 py-3 rounded-2xl border-none shadow-lg text-xs w-full"
            />
          </div>
        )}

        {/* State: COMPLETED */}
        {state === 'completed' && (
          <>
            {isTestFinished ? (
              (() => {
                const finalAvg = currentAvgScore || 0;
                const tierEval = evaluateScoreTier('visual', finalAvg);
                const isNewRec = bestRecord !== null && finalAvg > 0 ? finalAvg < bestRecord : false;
                return (
                  <GameResultView
                    modeTitle="Reaksi Visual"
                    subModeLabel="5 Ronde Standar"
                    primaryScore={finalAvg}
                    scoreUnit="ms"
                    isNewRecord={isNewRec}
                    tierRank={tierEval.rank}
                    tierName={tierEval.tierName}
                    tierCaption={tierEval.badgeLabel || 'Standar Reaksi Visual'}
                    tierDescription={tierEval.desc}
                    stats={[
                      {
                        id: 'fastest',
                        label: 'Refleks Tercepat',
                        value: `${roundsScores.length > 0 ? Math.min(...roundsScores) : 0} ms`,
                        highlight: true,
                      },
                      {
                        id: 'slowest',
                        label: 'Refleks Terlambat',
                        value: `${roundsScores.length > 0 ? Math.max(...roundsScores) : 0} ms`,
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
                  Ronde {currentRound} dari {TOTAL_ROUNDS}
                </span>
                <div className="text-5xl font-black font-mono text-slate-900 my-3 tracking-tight">
                  {latestScore} <span className="text-lg font-sans font-normal text-slate-500">ms</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Bagus! Bersiaplah untuk ronde berikutnya.
                </p>
                <AppButton
                  id="next-round-button"
                  label={`Lanjut ke Ronde ${currentRound + 1}`}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="trailing"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextRound();
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-6 py-3 rounded-2xl text-xs w-full"
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Status Panel - hidden when full test completed */}
      {state === 'idle' && (
        <ModePreparationFooter
          mode="visual"
          bestRecord={bestRecord}
          unit="ms"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}
      {/* In-Game Floating Rounds HUD Dock */}
      {state !== 'idle' && !(state === 'completed' && isTestFinished) && (
        <InGameRoundsFooter
          totalRounds={TOTAL_ROUNDS}
          currentRound={currentRound}
          roundsScores={roundsScores}
          accentColor="rose"
          unit="ms"
        />
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Reaksi Visual"
        accentColor="rose"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="visual"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="visual"
        modeTitle="Reaksi Visual"
        unit="ms"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
