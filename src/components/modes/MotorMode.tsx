import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
import { getMotorEvaluation, saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { RotateCcw, Play, Crosshair, Target, CheckCircle2 } from 'lucide-react';

interface MotorModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

interface TargetPosition {
  xPercent: number;
  yPercent: number;
  sizePx: number;
  spawnTime: number;
}

const TOTAL_DURATION_SECONDS = 60;

export const MotorMode: React.FC<MotorModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_DURATION_SECONDS);
  const [hitsCount, setHitsCount] = useState<number>(0);
  const [missesCount, setMissesCount] = useState<number>(0);
  const [target, setTarget] = useState<TargetPosition | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [avgAcquisitionMs, setAvgAcquisitionMs] = useState<number>(0);
  const [avgDeviationPx, setAvgDeviationPx] = useState<number>(0);
  const [showPenaltyNotice, setShowPenaltyNotice] = useState<boolean>(false);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const acquisitionTimesRef = useRef<number[]>([]);
  const deviationsRef = useRef<number[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const penaltyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current);
      penaltyTimeoutRef.current = null;
    }
  }, []);

  const finishGame = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setIsCompleted(true);
    setTarget(null);

    const netScore = Math.max(0, hitsCount - missesCount * 5);
    const avgTime =
      acquisitionTimesRef.current.length > 0
        ? Math.round(
            acquisitionTimesRef.current.reduce((a, b) => a + b, 0) /
              acquisitionTimesRef.current.length
          )
        : 0;
    const avgDev =
      deviationsRef.current.length > 0
        ? Math.round(
            deviationsRef.current.reduce((a, b) => a + b, 0) /
              deviationsRef.current.length
          )
        : 0;

    setAvgAcquisitionMs(avgTime);
    setAvgDeviationPx(avgDev);

    saveBestRecord('motor', netScore);
    const evalData = getMotorEvaluation(netScore);

    addHistoryItem({
      mode: 'motor',
      primaryMetric: netScore,
      unit: 'Hits',
      ratingLabel: evalData.tier,
      subMetric: `Bruto: ${hitsCount} | Meleset: ${missesCount} (-${missesCount * 5}) | Rerata: ${avgTime}ms | Deviasi: ±${avgDev}px`,
    });
    onRecordUpdated();
  }, [clearTimer, hitsCount, missesCount, onRecordUpdated]);

  const spawnNewTarget = useCallback(() => {
    // Dynamic random position within 10% to 85% of arena to prevent edge clipping
    const x = Math.floor(Math.random() * 75) + 10;
    const y = Math.floor(Math.random() * 70) + 15;
    // Dynamic size scaling slightly
    const size = Math.floor(Math.random() * 16) + 48; // 48px to 64px

    setTarget({
      xPercent: x,
      yPercent: y,
      sizePx: size,
      spawnTime: performance.now(),
    });
  }, []);

  const startGame = () => {
    clearTimer();
    playTactileClick();
    setHitsCount(0);
    setMissesCount(0);
    setTimeLeft(TOTAL_DURATION_SECONDS);
    setIsCompleted(false);
    acquisitionTimesRef.current = [];
    deviationsRef.current = [];
    setIsPlaying(true);
    startTimeRef.current = performance.now();

    spawnNewTarget();

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      finishGame();
    }
  }, [timeLeft, isPlaying, finishGame]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const handleTargetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isPlaying || !target) return;

    const hitTime = performance.now();
    const timeDelta = Math.round(hitTime - target.spawnTime);
    acquisitionTimesRef.current.push(timeDelta);

    // Calculate deviation from center of target
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clickX = e.clientX;
    const clickY = e.clientY;
    const distance = Math.round(
      Math.sqrt(Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2))
    );
    deviationsRef.current.push(distance);

    playTactileClick();
    setHitsCount((prev) => prev + 1);
    spawnNewTarget();
  };

  const handleArenaMissClick = () => {
    if (!isPlaying) return;
    playErrorBuzz();
    setMissesCount((prev) => prev + 1);
    setShowPenaltyNotice(true);

    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current);
    }
    penaltyTimeoutRef.current = setTimeout(() => {
      setShowPenaltyNotice(false);
    }, 800);
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startGame();
  };

  const handleRestartToPreparation = () => {
    clearTimer();
    setIsCountdownOpen(false);
    setIsPlaying(false);
    setIsCompleted(false);
    setTarget(null);
    setTimeLeft(TOTAL_DURATION_SECONDS);
    setHitsCount(0);
    setMissesCount(0);
    acquisitionTimesRef.current = [];
    deviationsRef.current = [];
  };

  const handleExitDirectly = () => {
    clearTimer();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  const netHitsScore = Math.max(0, hitsCount - missesCount * 5);

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900">
      {/* Header - hidden when completed */}
      {!isCompleted && (
        <InGameHUD
          title="Koordinasi Motorik"
          modeIcon={<Crosshair className="w-4 h-4 text-amber-500" />}
          isGameActive={isPlaying || isCountdownOpen}
          onExit={handleExitDirectly}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Main Motor Arena (Edge-to-edge full screen) */}
      <main
        id="motor-tracking-arena"
        onClick={handleArenaMissClick}
        className="w-full h-full min-h-[100dvh] relative overflow-hidden bg-slate-100 flex items-center justify-center px-4 pt-16 sm:pt-20 pb-20 sm:pb-24 cursor-crosshair overflow-y-auto"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Penalty Flashing Notice */}
        {showPenaltyNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-rose-600 text-white font-mono text-xs font-black shadow-lg animate-bounce z-40">
            MELESET! -5 HITS
          </div>
        )}

        {/* State: IDLE - Essential Guide Only */}
        {!isPlaying && !isCompleted && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full text-center relative z-10 flex flex-col items-center cursor-default"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-xs">
              <Crosshair className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Koordinasi Motorik
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Ketuk target lingkaran sasaran yang muncul secara acak di arena secepat dan setepat mungkin selama <strong className="text-slate-900 font-bold">60 detik</strong>.
            </p>

            <AppButton
              id="start-motor-test-button"
              label="MULAI 60 DETIK"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={() => setIsCountdownOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </div>
        )}

        {/* Target Entity */}
        {isPlaying && target && (
          <div
            onClick={handleTargetClick}
            style={{
              left: `${target.xPercent}%`,
              top: `${target.yPercent}%`,
              width: `${target.sizePx}px`,
              height: `${target.sizePx}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-90 border-4 border-white shadow-2xl flex items-center justify-center cursor-pointer transition-transform duration-75 z-20 group"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-125 transition-transform" />
            <div className="absolute inset-0 rounded-full border border-amber-300 animate-ping opacity-75 pointer-events-none" />
          </div>
        )}

        {/* State: COMPLETED (Scorecard) */}
        {isCompleted && (
          (() => {
            const tierEval = evaluateScoreTier('motor', netHitsScore);
            const isNewRec = bestRecord !== null ? netHitsScore > bestRecord : false;
            return (
              <GameResultView
                modeTitle="Koordinasi Motorik"
                subModeLabel="Uji Akurasi & Refleks (60 Detik)"
                primaryScore={netHitsScore}
                scoreUnit="Hits"
                isNewRecord={isNewRec}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Koordinasi Motorik'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'bruto',
                    label: 'Total Hits Bruto',
                    value: `${hitsCount}`,
                    highlight: true,
                  },
                  {
                    id: 'misses',
                    label: 'Target Meleset',
                    value: `${missesCount} (-${missesCount * 5})`,
                  },
                  {
                    id: 'speed',
                    label: 'Rerata Reaksi Akuisisi',
                    value: `${avgAcquisitionMs} ms`,
                  },
                ]}
                onBackToMenu={onBackToMenu}
                onRetry={handleRestartToPreparation}
              />
            );
          })()
        )}
      </main>

      {/* Bottom Status Panel - hidden when completed */}
      {!isPlaying && !isCompleted && (
        <ModePreparationFooter
          mode="motor"
          bestRecord={bestRecord}
          unit="Hits"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}
      {/* In-Game Floating Motor Status Dock */}
      {isPlaying && (
        <footer className="fixed bottom-3 sm:bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md mx-auto rounded-2xl bg-white/85 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm py-2.5 px-4 flex items-center justify-between font-mono text-xs transition-all">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-sans text-[11px] font-semibold">SISA WAKTU:</span>
              <span className="font-black text-rose-600 text-sm">{timeLeft}s</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500 font-sans text-[11px] font-semibold">HITS: </span>
                <strong className="text-emerald-600 font-black">{hitsCount}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px] font-semibold">MELESET: </span>
                <strong className="text-rose-600 font-black">{missesCount}</strong>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Koordinasi Motorik"
        accentColor="amber"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="motor"
        initialTab={infoTab}
      />

      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="motor"
        modeTitle="Koordinasi Motorik"
        unit="Hits"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
