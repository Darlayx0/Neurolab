import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneralTestState, AudioFrequency } from '../../types';
import { playStimulusBeep, playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getAudioEvaluation, saveBestRecord, getBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { InGameRoundsFooter } from '../common/InGameRoundsFooter';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { RotateCcw, Play, CheckCircle2, AlertTriangle, Headphones, Volume2, ArrowRight } from 'lucide-react';

interface AudioModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

const TOTAL_ROUNDS = 5;
const PENALTY_TIME_MS = 1000;

export const AudioMode: React.FC<AudioModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [state, setState] = useState<GeneralTestState>('idle');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsScores, setRoundsScores] = useState<number[]>([]);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [isTestFinished, setIsTestFinished] = useState<boolean>(false);
  const [selectedFreq, setSelectedFreq] = useState<AudioFrequency>(880);
  const currentSubModeKey = `freq_${selectedFreq}`;
  const currentBestRecord = getBestRecord('audio', currentSubModeKey);
  const [penaltyCount, setPenaltyCount] = useState<number>(0);
  const [totalPenaltyTime, setTotalPenaltyTime] = useState<number>(0);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const isAudioTriggeredRef = useRef<boolean>(false);

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
    isAudioTriggeredRef.current = false;
    setState('waiting');

    // Random unpredictable delay: 3000ms - 8000ms
    const delay = Math.floor(Math.random() * 5000) + 3000;

    timerRef.current = setTimeout(() => {
      isAudioTriggeredRef.current = true;
      startTimeRef.current = performance.now();
      playStimulusBeep(selectedFreq, 0.2);
    }, delay);
  }, [clearTimer, selectedFreq]);

  const handleContainerClick = () => {
    if (state === 'waiting') {
      if (!isAudioTriggeredRef.current) {
        clearTimer();
        playErrorBuzz();
        setPenaltyCount((prev) => prev + 1);
        setTotalPenaltyTime((prev) => prev + PENALTY_TIME_MS);
        setState('penalty');
      } else {
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
          const evalData = getAudioEvaluation(finalAvgScore);

          saveBestRecord('audio', finalAvgScore, currentSubModeKey);
          addHistoryItem({
            mode: 'audio',
            subMode: currentSubModeKey,
            subModeLabel: `${selectedFreq} Hz`,
            primaryMetric: finalAvgScore,
            unit: 'ms',
            ratingLabel: evalData.tier,
            subMetric: `Murni: ${Math.round(rawSum / TOTAL_ROUNDS)}ms • Penalti: +${totalPenaltyTime}ms (${penaltyCount}x) • Freq: ${selectedFreq}Hz`,
          });
          onRecordUpdated();
        } else {
          setState('completed');
        }
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
      {/* Header - hidden when test completed */}
      {!(state === 'completed' && isTestFinished) && (
        <InGameHUD
          title="Reaksi Suara"
          modeIcon={<Volume2 className="w-4 h-4 text-sky-500" />}
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
        id="audio-reaction-trigger-zone"
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
            ? 'bg-slate-950 text-slate-100'
            : state === 'penalty'
            ? 'bg-rose-100 text-rose-950'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        {/* State: IDLE - Essential Guide Only */}
        {state === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center mb-4 text-sky-600 shadow-xs">
              <Headphones className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Refleks Suara
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Saat tes dimulai, layar menjadi <strong className="text-slate-900 font-bold">GELAP TOTAL</strong>. Ketuk layar secepat mungkin segera setelah Anda mendengar nada suara beep.
            </p>

            {/* Frequency Selector */}
            <div className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 mb-6 text-left shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                <span>PILIH FREKUENSI NADA:</span>
                <span className="font-mono text-sky-600 font-bold">{selectedFreq} Hz</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([440, 880, 1760] as AudioFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFreq(freq);
                      playStimulusBeep(freq, 0.15);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      selectedFreq === freq
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {freq} Hz {freq === 440 ? '(Rendah)' : freq === 880 ? '(Sedang)' : '(Tinggi)'}
                  </button>
                ))}
              </div>
            </div>

            <AppButton
              id="start-audio-test-button"
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

        {/* State: WAITING (Dark Screen) */}
        {state === 'waiting' && (
          <div className="text-center relative z-10 select-none pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Headphones className="w-5 h-5 text-sky-400 opacity-60" />
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              Dengarkan Baik-Baik...
            </p>
          </div>
        )}

        {/* State: PENALTY */}
        {state === 'penalty' && (
          <div className="max-w-md w-full text-center relative z-10 p-6 rounded-3xl bg-white border border-rose-200 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              Terlalu Cepat (Prematur)!
            </h2>
            <p className="text-xs text-slate-600 mb-4">
              Anda menyentuh layar sebelum bunyi suara terdengar. Dikenakan penalti <strong className="text-rose-600">+{PENALTY_TIME_MS}ms</strong>.
            </p>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 font-mono text-xs font-bold mb-5 border border-rose-200">
              Total Penalti: +{totalPenaltyTime}ms ({penaltyCount}x)
            </div>
            <AppButton
              id="retry-audio-penalty-button"
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
                const tierEval = evaluateScoreTier('audio', finalAvg, currentSubModeKey);
                const isNewRec = currentBestRecord !== null && finalAvg > 0 ? finalAvg < currentBestRecord : false;
                return (
                  <GameResultView
                    modeTitle="Reaksi Suara"
                    subModeLabel={`Frekuensi ${selectedFreq} Hz • 5 Ronde`}
                    primaryScore={finalAvg}
                    scoreUnit="ms"
                    isNewRecord={isNewRec}
                    tierRank={tierEval.rank}
                    tierName={tierEval.tierName}
                    tierCaption={tierEval.badgeLabel || 'Standar Reaksi Suara'}
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
                  id="next-audio-round-button"
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

      {/* Bottom Status Panel - hidden when test completed */}
      {state === 'idle' && (
        <ModePreparationFooter
          mode="audio"
          bestRecord={currentBestRecord}
          unit="ms"
          subModeLabel={`${selectedFreq} Hz`}
          subModeId={currentSubModeKey}
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
          accentColor="sky"
          unit="ms"
        />
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Reaksi Suara"
        accentColor="sky"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="audio"
        initialTab={infoTab}
        initialSubMode={currentSubModeKey}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="audio"
        modeTitle="Reaksi Suara"
        unit="ms"
        initialSubMode={currentSubModeKey}
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
