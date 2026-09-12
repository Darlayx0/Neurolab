import React, { useState, useRef, useCallback } from 'react';
import { ChromaticPhase, ChromaticLevelConfig } from '../../types';
import {
  generateChromaticLevel,
  saveBestRecord,
  addHistoryItem,
  getChromaticEvaluation,
  EvaluationResult,
} from '../../utils/storage';
import {
  playTactileClick,
  playSelectionTap,
  playLevelClearFanfare,
  playNewRecordCelebration,
  playButtonPress,
} from '../../utils/audio';
import {
  Palette,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { evaluateScoreTier } from '../../utils/tierSystem';

interface ChromaticAnomalyModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

export const ChromaticAnomalyMode: React.FC<ChromaticAnomalyModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  // Game states
  const [phase, setPhase] = useState<ChromaticPhase>('idle');
  const [levelConfig, setLevelConfig] = useState<ChromaticLevelConfig | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [correctHits, setCorrectHits] = useState<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Interaction feedback states
  const [shakingTileIndex, setShakingTileIndex] = useState<number | null>(null);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Modals & Dialogs (Unified Info Modal for Guide & Tier Standards)
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // Refs
  const levelStartTimeRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);

  // Start Playing Game
  const startPlaying = () => {
    const firstLevel = generateChromaticLevel(1);
    setLevelConfig(firstLevel);
    setCurrentLevel(1);
    setScore(0);
    setCorrectHits(0);
    setReactionTimes([]);
    setIsNewRecord(false);
    setEvaluation(null);
    setShakingTileIndex(null);
    levelStartTimeRef.current = Date.now();
    setPhase('playing');
  };

  // Handle Game Over / Summary (Triggered upon single mistake - Sudden Death)
  const handleGameOver = useCallback((failedAtLevel: number, totalHits: number) => {
    const finalCompletedLevel = Math.max(1, failedAtLevel > 1 ? failedAtLevel - 1 : 1);
    const accuracy = totalHits > 0 ? 100 : 0;

    const evalResult = getChromaticEvaluation(finalCompletedLevel, accuracy);
    setEvaluation(evalResult);

    // Save record
    const { isNewBest } = saveBestRecord('chromatic', finalCompletedLevel);
    setIsNewRecord(isNewBest);

    if (isNewBest) {
      playNewRecordCelebration();
    } else {
      playLevelClearFanfare(2);
    }

    // Add history item
    addHistoryItem({
      mode: 'chromatic',
      primaryMetric: finalCompletedLevel,
      unit: 'Level',
      ratingLabel: evalResult.tier,
      subMetric: `1 Nyawa • Akhir Level ${failedAtLevel}`,
    });

    onRecordUpdated();
    setPhase('summary');
  }, [onRecordUpdated]);

  // Handle tile click (5x5 grid with 1-life sudden death rule)
  const handleTileClick = (index: number) => {
    if (phase !== 'playing' || !levelConfig) return;

    // Prevent rapid double-tapping
    const now = Date.now();
    if (now - lastClickTimeRef.current < 120) return;
    lastClickTimeRef.current = now;

    if (index === levelConfig.targetIndex) {
      // Correct target tile clicked!
      const reactionMs = now - levelStartTimeRef.current;
      setReactionTimes((prev) => [...prev, reactionMs]);
      const updatedHits = correctHits + 1;
      setCorrectHits(updatedHits);

      const nextLevel = currentLevel + 1;
      setCurrentLevel(nextLevel);
      setScore((prev) => prev + 100 * currentLevel);

      // Play sound
      if (nextLevel % 5 === 0) {
        playLevelClearFanfare(Math.floor(nextLevel / 5));
      } else {
        playSelectionTap();
      }

      // Generate next level (diff gets smaller)
      const nextConfig = generateChromaticLevel(nextLevel);
      setLevelConfig(nextConfig);
      levelStartTimeRef.current = Date.now();
    } else {
      // Wrong tile clicked: 1-Life Sudden Death -> Immediate Game Over
      playTactileClick();
      setShakingTileIndex(index);
      setTimeout(() => {
        setShakingTileIndex(null);
        handleGameOver(currentLevel, correctHits);
      }, 300);
    }
  };

  const handleStartCountdown = () => {
    playButtonPress();
    setIsCountdownOpen(true);
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    startPlaying();
  };

  const handleRestartToPreparation = () => {
    setIsCountdownOpen(false);
    setCurrentLevel(1);
    setScore(0);
    setCorrectHits(0);
    setReactionTimes([]);
    setLevelConfig(null);
    setShakingTileIndex(null);
    setPhase('idle');
  };

  const avgReactionTime =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Navigation HUD - hidden when summary */}
      {phase !== 'summary' && (
        <InGameHUD
          title="Pembeda Warna"
          modeIcon={<Palette className="w-5 h-5 text-fuchsia-600" />}
          isGameActive={phase === 'playing' || isCountdownOpen}
          onExit={onBackToMenu}
          onRestart={handleRestartToPreparation}
          onOpenGuide={() => {
            setInfoTab('guide');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* Main View Area (Edge-to-edge full screen with safe padding) */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 min-h-0 overflow-y-auto">
        {/* ========================================================================= */}
        {/* 1. IDLE / PREPARATION PHASE */}
        {/* ========================================================================= */}
        {phase === 'idle' && (
          <div className="w-full max-w-md flex flex-col items-center justify-center text-center my-auto px-4">
            {/* Minimalist Visual Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-fuchsia-50 border border-fuchsia-200/80 text-fuchsia-600 flex items-center justify-center mb-5 shadow-xs">
              <Palette className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Pembeda Warna Anomali
            </h1>

            {/* To the point instruction */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-8 max-w-sm">
              Temukan satu ubin anomali dengan gradasi warna berbeda di kisi 5x5. Sistem 1 nyawa tanpa batasan waktu: amati dengan tenang dan teliti.
            </p>

            {/* Primary Action Button */}
            <div className="w-full max-w-xs">
              <AppButton
                id="start-chromatic-btn"
                label="Mulai Sesi Uji"
                icon={<Play className="w-4 h-4 fill-current" />}
                iconPosition="leading"
                variant="primary"
                onClick={handleStartCountdown}
                className="w-full py-3.5 text-sm sm:text-base font-black shadow-lg shadow-slate-950/10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PLAYING PHASE (Level on Left, Rentang Warna on Far Right, No Timer) */}
        {/* ========================================================================= */}
        {phase === 'playing' && levelConfig && (
          <div className="w-full h-full max-w-md flex flex-col justify-between items-center py-2 px-3">
            {/* Status Bar: Label Level on LEFT, Rentang Warna on FAR RIGHT */}
            <div className="w-full shrink-0 flex items-center justify-between mb-3 px-1">
              {/* Left: Label Level */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 tracking-wide shadow-2xs">
                  Level {currentLevel}
                </span>
              </div>

              {/* Far Right: Label Persentase Rentang Warna */}
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 tracking-tight shadow-2xs">
                  Rentang Warna: {levelConfig.deltaL}%
                </span>
              </div>
            </div>

            {/* 5x5 Grid Container (Guaranteed 1:1 Aspect Ratio, Clean & Spacious) */}
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <div className="w-full max-w-[400px] aspect-square p-2.5 sm:p-3 bg-white border border-slate-200/90 rounded-3xl shadow-sm flex items-center justify-center">
                <div className="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-2.5 w-full h-full">
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const isAnomaly = idx === levelConfig.targetIndex;
                    const c = isAnomaly ? levelConfig.anomalyColor : levelConfig.baseColor;
                    const bgHsl = `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
                    const isShaking = shakingTileIndex === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTileClick(idx)}
                        style={{ backgroundColor: bgHsl }}
                        aria-label={`Ubin warna ${idx + 1}`}
                        className={`w-full h-full rounded-xl sm:rounded-2xl transition-all duration-75 cursor-pointer active:scale-95 border border-black/5 hover:brightness-105 shadow-2xs ${
                          isShaking ? 'animate-bounce border-2 border-rose-500 scale-95' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Tip for Relaxed Gameplay */}
            <div className="w-full py-2 text-center text-[11px] font-semibold text-slate-400">
              Satu nyawa • Amati dengan cermat tanpa batasan waktu
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SUMMARY PHASE (Game Over) */}
        {/* ========================================================================= */}
        {phase === 'summary' && (
          (() => {
            const finalLevel = Math.max(1, currentLevel > 1 ? currentLevel - 1 : 1);
            const tierEval = evaluateScoreTier('chromatic', finalLevel);
            const isNewRec = isNewRecord || (bestRecord !== null && finalLevel > bestRecord);
            return (
              <GameResultView
                modeTitle="Pembeda Warna"
                subModeLabel="Uji Anomali Kromatik (Kisi 5x5)"
                primaryScore={finalLevel}
                scoreUnit="Level"
                isNewRecord={isNewRec}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Pembeda Warna'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'final_level',
                    label: 'Level Tertinggi Tuntas',
                    value: `Level ${finalLevel}`,
                    highlight: true,
                  },
                  {
                    id: 'tiles_found',
                    label: 'Ubin Anomali Ditemukan',
                    value: `${correctHits} Ubin Sukses`,
                  },
                  {
                    id: 'final_delta',
                    label: 'Deviasi Warna Akhir',
                    value: `Δ ${levelConfig ? levelConfig.deltaL : 1.0}%`,
                  },
                ]}
                onBackToMenu={onBackToMenu}
                onRetry={handleRestartToPreparation}
              />
            );
          })()
        )}
      </main>

      {/* Preparation Footer */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="chromatic"
          bestRecord={bestRecord}
          unit="Level"
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
        title="Pembeda Warna"
        accentColor="fuchsia"
      />

      {/* Unified Modal: Panduan & Standar Tier */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="chromatic"
        initialTab={infoTab}
      />

      {/* Record Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="chromatic"
        modeTitle="Pembeda Warna Anomali"
        unit="Level"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
