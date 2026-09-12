import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneralTestState } from '../../types';
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
import { ArrowLeftRight, Play, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, Zap, Hash, Split, Sparkles } from 'lucide-react';

interface SwitchingModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type SwitchingRule = 'parity' | 'magnitude'; // parity: odd vs even, magnitude: <5 vs >5
type UserChoice = 'left' | 'right';

interface TrialItem {
  id: number;
  rule: SwitchingRule;
  number: number;
  correctChoice: UserChoice;
  isSwitch: boolean;
}

interface TrialResult {
  trialId: number;
  isSwitch: boolean;
  isCorrect: boolean;
  reactionTimeMs: number;
}

const TOTAL_TRIALS = 30;
const VALID_NUMBERS = [1, 2, 3, 4, 6, 7, 8, 9]; // Excluding 5 for unambiguous binary decision

function generateTrials(): TrialItem[] {
  const trials: TrialItem[] = [];
  let prevRule: SwitchingRule = Math.random() < 0.5 ? 'parity' : 'magnitude';
  let consecutiveCount = 1;

  for (let i = 1; i <= TOTAL_TRIALS; i++) {
    let currentRule: SwitchingRule;

    if (i === 1) {
      currentRule = prevRule;
    } else {
      // Force switch if repeated 3 times to avoid monotony, else 50% probability
      if (consecutiveCount >= 3) {
        currentRule = prevRule === 'parity' ? 'magnitude' : 'parity';
        consecutiveCount = 1;
      } else {
        const shouldSwitch = Math.random() < 0.5;
        if (shouldSwitch) {
          currentRule = prevRule === 'parity' ? 'magnitude' : 'parity';
          consecutiveCount = 1;
        } else {
          currentRule = prevRule;
          consecutiveCount++;
        }
      }
    }

    // Pick random number
    const num = VALID_NUMBERS[Math.floor(Math.random() * VALID_NUMBERS.length)];

    // Determine correct choice
    let correctChoice: UserChoice;
    if (currentRule === 'parity') {
      // Left = Ganjil (1, 3, 7, 9), Right = Genap (2, 4, 6, 8)
      correctChoice = num % 2 !== 0 ? 'left' : 'right';
    } else {
      // Left = Kecil (< 5: 1, 2, 3, 4), Right = Besar (> 5: 6, 7, 8, 9)
      correctChoice = num < 5 ? 'left' : 'right';
    }

    const isSwitch = i > 1 && currentRule !== prevRule;
    trials.push({
      id: i,
      rule: currentRule,
      number: num,
      correctChoice,
      isSwitch,
    });

    prevRule = currentRule;
  }

  return trials;
}

export const SwitchingMode: React.FC<SwitchingModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [state, setState] = useState<GeneralTestState>('idle');
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [currentTrialIdx, setCurrentTrialIdx] = useState<number>(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [computedStats, setComputedStats] = useState<GameResultStat[]>([]);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const isInputLockedRef = useRef<boolean>(false);

  // Handle choice submission
  const handleUserChoice = useCallback((choice: UserChoice) => {
    if (state !== 'ready' || isInputLockedRef.current) return;

    const currentTrial = trials[currentTrialIdx];
    if (!currentTrial) return;

    isInputLockedRef.current = true;
    const now = performance.now();
    const rt = Math.round(now - startTimeRef.current);
    const isCorrect = choice === currentTrial.correctChoice;

    if (isCorrect) {
      playTactileClick();
      setFeedback('correct');
    } else {
      playErrorBuzz();
      setFeedback('wrong');
    }

    const updatedResults = [
      ...results,
      {
        trialId: currentTrial.id,
        isSwitch: currentTrial.isSwitch,
        isCorrect,
        reactionTimeMs: rt,
      },
    ];
    setResults(updatedResults);

    // Transition to next trial or finish
    setTimeout(() => {
      setFeedback(null);
      if (currentTrialIdx + 1 < TOTAL_TRIALS) {
        setCurrentTrialIdx((prev) => prev + 1);
        startTimeRef.current = performance.now();
        isInputLockedRef.current = false;
      } else {
        // Complete the test session
        finishSession(updatedResults);
      }
    }, 180);
  }, [state, trials, currentTrialIdx, results]);

  // Keyboard navigation
  useEffect(() => {
    if (state !== 'ready') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleUserChoice('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleUserChoice('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, handleUserChoice]);

  // Start countdown
  const handleStart = () => {
    playTactileClick();
    setIsCountdownOpen(true);
  };

  // When countdown completes, start playing
  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    const newTrials = generateTrials();
    setTrials(newTrials);
    setCurrentTrialIdx(0);
    setResults([]);
    setFeedback(null);
    setState('ready');
    isInputLockedRef.current = false;
    startTimeRef.current = performance.now();
  };

  // Finish session calculation
  const finishSession = (finalResults: TrialResult[]) => {
    setState('completed');
    isInputLockedRef.current = true;

    // Separate repeat vs switch trials (ignoring first trial and only taking correct responses)
    const repeatCorrect = finalResults.filter((r) => !r.isSwitch && r.trialId > 1 && r.isCorrect);
    const switchCorrect = finalResults.filter((r) => r.isSwitch && r.isCorrect);

    const avgRepeat = repeatCorrect.length > 0
      ? repeatCorrect.reduce((acc, r) => acc + r.reactionTimeMs, 0) / repeatCorrect.length
      : 450;

    const avgSwitch = switchCorrect.length > 0
      ? switchCorrect.reduce((acc, r) => acc + r.reactionTimeMs, 0) / switchCorrect.length
      : 600;

    const rawSwitchCost = Math.round(avgSwitch - avgRepeat);
    const errorCount = finalResults.filter((r) => !r.isCorrect).length;
    const accuracy = Math.round(((TOTAL_TRIALS - errorCount) / TOTAL_TRIALS) * 100);
    const penaltyMs = errorCount * 150;
    const effectiveCost = Math.max(25, Math.round(rawSwitchCost + penaltyMs));

    setFinalScore(effectiveCost);

    // Save record
    const recordResult = saveBestRecord('switching', effectiveCost);
    setIsNewBest(recordResult.isNewBest);
    if (recordResult.isNewBest) {
      onRecordUpdated();
    }

    const tierEval = evaluateScoreTier('switching', effectiveCost);
    addHistoryItem({
      mode: 'switching',
      primaryMetric: effectiveCost,
      unit: 'ms',
      subMetric: `Repeat: ${Math.round(avgRepeat)}ms | Switch: ${Math.round(avgSwitch)}ms | Akurasi: ${accuracy}%`,
      ratingLabel: tierEval.badgeLabel,
    });

    setComputedStats([
      {
        id: 'switch_cost',
        label: 'Switch Cost Murni',
        value: `${rawSwitchCost} ms`,
        highlight: true,
      },
      {
        id: 'repeat_rt',
        label: 'Mean Repeat RT',
        value: `${Math.round(avgRepeat)} ms`,
      },
      {
        id: 'switch_rt',
        label: 'Mean Switch RT',
        value: `${Math.round(avgSwitch)} ms`,
      },
      {
        id: 'accuracy',
        label: 'Akurasi Respon',
        value: `${accuracy}% (${TOTAL_TRIALS - errorCount}/${TOTAL_TRIALS})`,
        highlight: accuracy >= 90,
      },
      {
        id: 'penalty',
        label: 'Penalti Error',
        value: `+${penaltyMs} ms (${errorCount} salah)`,
      },
    ]);

    playSuccessChime();
  };

  const handleRestartToPreparation = () => {
    setIsCountdownOpen(false);
    isInputLockedRef.current = true;
    setCurrentTrialIdx(0);
    setResults([]);
    setFeedback(null);
    setState('idle');
  };

  const activeTrial = trials[currentTrialIdx];
  const isParity = activeTrial?.rule === 'parity';
  const tierInfo = evaluateScoreTier('switching', finalScore);

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      {/* Top HUD */}
      <InGameHUD
        title="Pengalihan Pola"
        modeIcon={<ArrowLeftRight className="w-5 h-5 text-teal-600" />}
        isGameActive={state === 'ready' || isCountdownOpen}
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

      {/* Main Interactive Stage (Edge-to-edge from top to bottom) */}
      <main className="w-full h-full min-h-[100dvh] px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 flex flex-col items-center justify-center overflow-y-auto">
        {/* State 1: IDLE / PREPARATION */}
        {state === 'idle' && (
          <div className="w-full text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-3xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4 shadow-sm shadow-teal-500/15">
              <ArrowLeftRight className="w-7 h-7 text-teal-600" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Pengalihan Pola (Task Switching)
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
              Uji fleksibilitas kognitif dan biaya transisi mental (<span className="font-semibold text-slate-900">Switch Cost</span>) saat berpindah acak antara dua aturan logika angka.
            </p>

            {/* Rule Explanations Box */}
            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left text-xs">
              {/* Rule 1: Parity */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-black text-emerald-900 uppercase text-[11px] tracking-wider">
                    Bingkai Emerald
                  </span>
                </div>
                <div className="font-bold text-slate-800 text-sm">Paritas Angka</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">
                  Pilih <span className="font-bold text-emerald-800">Ganjil</span> (1, 3, 7, 9) atau <span className="font-bold text-emerald-800">Genap</span> (2, 4, 6, 8).
                </div>
              </div>

              {/* Rule 2: Magnitude */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="font-black text-indigo-900 uppercase text-[11px] tracking-wider">
                    Bingkai Indigo
                  </span>
                </div>
                <div className="font-bold text-slate-800 text-sm">Besaran Angka</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">
                  Pilih <span className="font-bold text-indigo-800">Kecil</span> (&lt; 5) atau <span className="font-bold text-indigo-800">Besar</span> (&gt; 5).
                </div>
              </div>
            </div>

            {/* Start Button */}
            <AppButton
              label="Mulai Pengujian"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={handleStart}
              className="px-8 py-3.5 text-sm font-black shadow-lg shadow-teal-600/25 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl cursor-pointer"
            />
          </div>
        )}

        {/* State 2: PLAYING ACTIVE STAGE */}
        {state === 'ready' && activeTrial && (
          <div className="w-full flex flex-col items-center justify-between gap-5 sm:gap-6 animate-in fade-in duration-200 max-w-lg">
            {/* Elegant Minimalist Top Header & Progress */}
            <div className="w-full flex flex-col gap-2">
              <div className="w-full flex items-center justify-between px-1 text-xs">
                {/* Current Round Indicator */}
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                    Ronde {activeTrial.id}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    / {TOTAL_TRIALS}
                  </span>
                </div>

                {/* Transition Dynamic Status Badge */}
                <div>
                  {activeTrial.isSwitch ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-xs animate-in fade-in duration-150">
                      <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                      <span>Transisi Aturan</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100/90 text-slate-600 border border-slate-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Aturan Konstan</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Smooth Continuous Progress Bar */}
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isParity ? 'bg-emerald-600' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${(activeTrial.id / TOTAL_TRIALS) * 100}%` }}
                />
              </div>
            </div>

            {/* Central Stimulus Stage (Open, Clean, Sophisticated) */}
            <div
              className={`w-full py-8 sm:py-12 px-6 sm:px-8 rounded-3xl border transition-all duration-200 flex flex-col items-center justify-center text-center relative overflow-hidden ${
                isParity
                  ? 'bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 border-emerald-300/80 shadow-sm shadow-emerald-600/5'
                  : 'bg-gradient-to-b from-indigo-50/70 via-white to-indigo-50/30 border-indigo-300/80 shadow-sm shadow-indigo-600/5'
              } ${
                feedback === 'correct'
                  ? 'ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/90'
                  : feedback === 'wrong'
                  ? 'ring-2 ring-rose-500/50 border-rose-500 bg-rose-50/90'
                  : ''
              }`}
            >
              {/* Dynamic Task Cue Bar */}
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 transition-colors duration-200 ${
                  isParity
                    ? 'bg-emerald-700 text-white shadow-xs shadow-emerald-700/20'
                    : 'bg-indigo-700 text-white shadow-xs shadow-indigo-700/20'
                }`}
              >
                {isParity ? (
                  <>
                    <Hash className="w-3.5 h-3.5" />
                    <span>PARITAS ANGKA</span>
                  </>
                ) : (
                  <>
                    <Split className="w-3.5 h-3.5" />
                    <span>BESARAN ANGKA</span>
                  </>
                )}
              </div>

              {/* Explicit Active Directive Question */}
              <div className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">
                {isParity
                  ? 'Tentukan apakah angka bernilai Ganjil atau Genap'
                  : 'Tentukan apakah angka bernilai < 5 (Kecil) atau > 5 (Besar)'}
              </div>

              {/* Giant Stimulus Number Display */}
              <div className="text-8xl sm:text-9xl font-black font-mono text-slate-900 tracking-tight leading-none my-3 select-none drop-shadow-xs">
                {activeTrial.number}
              </div>

              {/* Subtle Ambient Indicator Line */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mt-1">
                <span>Fokus pada warna & angka</span>
              </div>
            </div>

            {/* Ergonomic Response Action Dock (Touch & Keyboard Ergonomics) */}
            <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 pt-1">
              {/* Left Action Button */}
              <button
                type="button"
                onClick={() => handleUserChoice('left')}
                className={`min-h-[74px] sm:min-h-[82px] px-4 py-3 rounded-2xl border transition-all duration-100 cursor-pointer flex flex-col items-center justify-center relative active:scale-[0.98] select-none ${
                  isParity
                    ? 'bg-white hover:bg-emerald-50/80 text-emerald-950 border-emerald-200 hover:border-emerald-300 shadow-xs'
                    : 'bg-white hover:bg-indigo-50/80 text-indigo-950 border-indigo-200 hover:border-indigo-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight whitespace-nowrap">
                  <ArrowLeft className="w-4 h-4 shrink-0 text-slate-500" />
                  <span>{isParity ? 'GANJIL' : 'KECIL (< 5)'}</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 text-[10px] font-bold text-slate-600">A</kbd>
                  <span>atau</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 text-[10px] font-bold text-slate-600">←</kbd>
                </div>
              </button>

              {/* Right Action Button */}
              <button
                type="button"
                onClick={() => handleUserChoice('right')}
                className={`min-h-[74px] sm:min-h-[82px] px-4 py-3 rounded-2xl border transition-all duration-100 cursor-pointer flex flex-col items-center justify-center relative active:scale-[0.98] select-none ${
                  isParity
                    ? 'bg-white hover:bg-emerald-50/80 text-emerald-950 border-emerald-200 hover:border-emerald-300 shadow-xs'
                    : 'bg-white hover:bg-indigo-50/80 text-indigo-950 border-indigo-200 hover:border-indigo-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight whitespace-nowrap">
                  <span>{isParity ? 'GENAP' : 'BESAR (> 5)'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-slate-500" />
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 text-[10px] font-bold text-slate-600">D</kbd>
                  <span>atau</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 text-[10px] font-bold text-slate-600">→</kbd>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* State 3: COMPLETED RESULT SCREEN */}
        {state === 'completed' && (
          <GameResultView
            modeTitle="Pengalihan Pola"
            primaryScore={finalScore}
            scoreUnit="ms"
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

      {/* Preparation Footer (Idle State only) */}
      {state === 'idle' && (
        <ModePreparationFooter
          mode="switching"
          bestRecord={bestRecord}
          unit="ms"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Countdown Overlay */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Pengalihan Pola"
        accentColor="teal"
      />

      {/* Information & Standards Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="switching"
        initialTab={infoTab}
      />

      {/* Personal Records & History Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="switching"
        modeTitle="Pengalihan Pola"
        unit="ms"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
