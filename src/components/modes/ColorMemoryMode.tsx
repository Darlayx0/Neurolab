import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Boxes,
  Play,
  Sparkles,
  Eye,
  Check,
  X,
  Target,
  AlertOctagon,
} from 'lucide-react';
import {
  ChromaColorDefinition,
  ChromaTile,
  ChromaLevelConfig,
  ColorMemoryPhase,
} from '../../types';
import { playTactileClick, playSuccessChime, playErrorBuzz } from '../../utils/audio';
import { saveBestRecord, addHistoryItem, getColorMemoryEvaluation } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';

// ============================================================================
// 1. PALET WARNA KROMATIK (Harmonis, Kontras Tinggi, & Ramah Visual)
// ============================================================================

export const CHROMA_PALETTE: ChromaColorDefinition[] = [
  {
    id: 'blue',
    name: 'Biru Samudra',
    hex: '#2563eb',
    twBg: 'bg-blue-600',
    twBorder: 'border-blue-500',
    twText: 'text-blue-600',
    twRing: 'ring-blue-500/40',
    twGlow: 'shadow-blue-500/35',
  },
  {
    id: 'amber',
    name: 'Kuning Amber',
    hex: '#f59e0b',
    twBg: 'bg-amber-500',
    twBorder: 'border-amber-400',
    twText: 'text-amber-500',
    twRing: 'ring-amber-500/40',
    twGlow: 'shadow-amber-500/35',
  },
  {
    id: 'emerald',
    name: 'Hijau Zamrud',
    hex: '#10b981',
    twBg: 'bg-emerald-500',
    twBorder: 'border-emerald-400',
    twText: 'text-emerald-500',
    twRing: 'ring-emerald-500/40',
    twGlow: 'shadow-emerald-500/35',
  },
  {
    id: 'rose',
    name: 'Merah Mawar',
    hex: '#f43f5e',
    twBg: 'bg-rose-500',
    twBorder: 'border-rose-400',
    twText: 'text-rose-500',
    twRing: 'ring-rose-500/40',
    twGlow: 'shadow-rose-500/35',
  },
  {
    id: 'violet',
    name: 'Ungu Violet',
    hex: '#8b5cf6',
    twBg: 'bg-violet-500',
    twBorder: 'border-violet-400',
    twText: 'text-violet-500',
    twRing: 'ring-violet-500/40',
    twGlow: 'shadow-violet-500/35',
  },
  {
    id: 'orange',
    name: 'Oranye Jingga',
    hex: '#f97316',
    twBg: 'bg-orange-500',
    twBorder: 'border-orange-400',
    twText: 'text-orange-500',
    twRing: 'ring-orange-500/40',
    twGlow: 'shadow-orange-500/35',
  },
  {
    id: 'cyan',
    name: 'Sian Neon',
    hex: '#06b6d4',
    twBg: 'bg-cyan-500',
    twBorder: 'border-cyan-400',
    twText: 'text-cyan-500',
    twRing: 'ring-cyan-500/40',
    twGlow: 'shadow-cyan-500/35',
  },
  {
    id: 'fuchsia',
    name: 'Merah Muda Fuksia',
    hex: '#d946ef',
    twBg: 'bg-fuchsia-500',
    twBorder: 'border-fuchsia-400',
    twText: 'text-fuchsia-500',
    twRing: 'ring-fuchsia-500/40',
    twGlow: 'shadow-fuchsia-500/35',
  },
];

// ============================================================================
// 2. GENERATOR LEVEL & TILE DISTRIBUTION
// ============================================================================

export function generateLevelConfig(level: number): ChromaLevelConfig {
  let gridSize = 3;
  if (level >= 12) gridSize = 6;
  else if (level >= 8) gridSize = 5;
  else if (level >= 4) gridSize = 4;
  else gridSize = 3;

  const totalTiles = gridSize * gridSize;

  let colorCount = 2;
  if (level <= 2) colorCount = 2;
  else if (level <= 5) colorCount = 3;
  else if (level <= 8) colorCount = 4;
  else if (level <= 10 || level === 12) colorCount = 5;
  else if (level === 11 || level === 13) colorCount = 6;
  else if (level === 14) colorCount = 7;
  else colorCount = 8;

  let baseDuration = 2800;
  if (gridSize === 4) baseDuration = 3200;
  if (gridSize === 5) baseDuration = 3600;
  if (gridSize === 6) baseDuration = 4200;

  const speedReduction = Math.min(600, ((level - 1) % 4) * 150);
  const memorizeDurationMs = Math.max(2200, baseDuration - speedReduction);

  const shuffledColors = [...CHROMA_PALETTE].sort(() => Math.random() - 0.5);
  const activeColors = shuffledColors.slice(0, colorCount);

  const targetColor = activeColors[Math.floor(Math.random() * activeColors.length)];

  return {
    level,
    gridSize,
    totalTiles,
    colorCount,
    memorizeDurationMs,
    activeColors,
    targetColor,
    targetCount: 0,
  };
}

export function generateTilesForConfig(config: ChromaLevelConfig): {
  tiles: ChromaTile[];
  targetCount: number;
} {
  const { totalTiles, colorCount, activeColors, targetColor } = config;
  const tileColors: ChromaColorDefinition[] = [];

  // Garansi setiap warna aktif memiliki minimal 2 ubin
  for (let i = 0; i < colorCount; i++) {
    tileColors.push(activeColors[i]);
    tileColors.push(activeColors[i]);
  }

  // Isi sisa ubin secara acak dari warna aktif
  while (tileColors.length < totalTiles) {
    const randomColor = activeColors[Math.floor(Math.random() * activeColors.length)];
    tileColors.push(randomColor);
  }

  // Pastikan target color memiliki minimal 2 ubin dan tidak mencakup seluruh ubin
  let targetCount = tileColors.filter((c) => c.id === targetColor.id).length;
  if (targetCount === totalTiles) {
    const otherColor = activeColors.find((c) => c.id !== targetColor.id) || activeColors[0];
    tileColors[0] = otherColor;
    targetCount--;
  }

  // Acak posisi ubin (Fisher-Yates shuffle)
  for (let i = tileColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileColors[i], tileColors[j]] = [tileColors[j], tileColors[i]];
  }

  const finalTargetCount = tileColors.filter((c) => c.id === targetColor.id).length;

  const tiles: ChromaTile[] = tileColors.map((color, index) => ({
    id: index,
    colorId: color.id,
    color,
    isRevealed: false,
    isMatched: false,
    isWrong: false,
  }));

  return { tiles, targetCount: finalTargetCount };
}

// ============================================================================
// 3. KOMPONEN UTAMA
// ============================================================================

interface ColorMemoryModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

export const ColorMemoryMode: React.FC<ColorMemoryModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [level, setLevel] = useState<number>(1);
  const [phase, setPhase] = useState<ColorMemoryPhase>('idle');
  const [tiles, setTiles] = useState<ChromaTile[]>([]);
  const [levelConfig, setLevelConfig] = useState<ChromaLevelConfig | null>(null);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  const [memorizeProgress, setMemorizeProgress] = useState<number>(100);

  // Modals
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  const memorizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const memorizeStartTimestamp = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    if (memorizeTimerRef.current) {
      clearTimeout(memorizeTimerRef.current);
      memorizeTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const startLevel = useCallback(
    (targetLvl: number) => {
      clearAllTimers();
      const config = generateLevelConfig(targetLvl);
      const { tiles: generatedTiles, targetCount } = generateTilesForConfig(config);
      config.targetCount = targetCount;

      setLevelConfig(config);
      setTiles(generatedTiles);
      setMatchedCount(0);
      setMemorizeProgress(100);
      setPhase('memorize');

      memorizeStartTimestamp.current = performance.now();

      const duration = config.memorizeDurationMs;
      const animateProgress = () => {
        const elapsed = performance.now() - memorizeStartTimestamp.current;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setMemorizeProgress(remaining);

        if (elapsed < duration) {
          animationFrameRef.current = requestAnimationFrame(animateProgress);
        } else {
          setMemorizeProgress(0);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animateProgress);

      memorizeTimerRef.current = setTimeout(() => {
        setPhase('recall');
      }, duration);
    },
    [clearAllTimers]
  );

  const handleStartGame = () => {
    clearAllTimers();
    playTactileClick();
    setLevel(1);
    startLevel(1);
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    handleStartGame();
  };

  const handleTileClick = (tile: ChromaTile) => {
    if (phase !== 'recall' || !levelConfig) return;
    if (tile.isMatched || tile.isWrong) return;

    const isTarget = tile.colorId === levelConfig.targetColor.id;

    if (isTarget) {
      // Benar!
      playTactileClick();
      const newMatched = matchedCount + 1;
      setMatchedCount(newMatched);

      setTiles((prev) =>
        prev.map((t) =>
          t.id === tile.id ? { ...t, isMatched: true, isRevealed: true } : t
        )
      );

      if (newMatched >= levelConfig.targetCount) {
        // Level Tuntas!
        playSuccessChime();
        setPhase('level_cleared');

        const nextLevel = level + 1;
        transitionTimerRef.current = setTimeout(() => {
          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 1100);
      }
    } else {
      // SALAH! Aturan Tanpa Nyawa (Sudden Death)
      clearAllTimers();
      playErrorBuzz();

      // Tandai ubin salah dengan efek getar merah dan buka ubin target yang tersisa
      setTiles((prev) =>
        prev.map((t) => {
          if (t.id === tile.id) {
            return { ...t, isWrong: true, isRevealed: true };
          }
          if (t.colorId === levelConfig.targetColor.id) {
            return { ...t, isRevealed: true };
          }
          return t;
        })
      );

      transitionTimerRef.current = setTimeout(() => {
        setPhase('game_over');

        const finalScore = Math.max(1, level - 1);
        saveBestRecord('color_memory', finalScore);
        const evalData = getColorMemoryEvaluation(finalScore);

        addHistoryItem({
          mode: 'color_memory',
          primaryMetric: finalScore,
          unit: 'Level',
          ratingLabel: evalData.tier,
          subMetric: `Gagal di Level ${level} (Grid ${levelConfig.gridSize}x${levelConfig.gridSize}, Target: ${levelConfig.targetColor.name})`,
        });

        onRecordUpdated();
      }, 1000);
    }
  };

  const handleRestartToPreparation = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    setLevel(1);
    setTiles([]);
    setLevelConfig(null);
    setMatchedCount(0);
    setPhase('idle');
  };

  const handleExitDirectly = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    onBackToMenu();
  };

  const remainingTargets = useMemo(() => {
    if (!levelConfig) return 0;
    return Math.max(0, levelConfig.targetCount - matchedCount);
  }, [levelConfig, matchedCount]);

  const gridClasses = useMemo(() => {
    if (!levelConfig) return 'grid-cols-3';
    switch (levelConfig.gridSize) {
      case 4:
        return 'grid-cols-4';
      case 5:
        return 'grid-cols-5';
      case 6:
        return 'grid-cols-6';
      default:
        return 'grid-cols-3';
    }
  }, [levelConfig]);

  const arenaMaxWidth = useMemo(() => {
    if (!levelConfig) return 'max-w-xs sm:max-w-sm';
    switch (levelConfig.gridSize) {
      case 4:
        return 'max-w-sm sm:max-w-md';
      case 5:
        return 'max-w-sm sm:max-w-[420px]';
      case 6:
        return 'max-w-[340px] sm:max-w-[440px]';
      default:
        return 'max-w-xs sm:max-w-sm';
    }
  }, [levelConfig]);

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900 bg-slate-50">
      {/* 1. Header (Hidden during game_over) */}
      {phase !== 'game_over' && (
        <InGameHUD
          title="Memori Kromatik"
          modeIcon={<Boxes className="w-4 h-4 text-pink-500" />}
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

      {/* 2. Main Arena */}
      <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Phase: IDLE - Preparation Screen */}
        {phase === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-pink-50 border border-pink-200 flex items-center justify-center mb-4 text-pink-600 shadow-xs">
              <Boxes className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Memori Kromatik
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Hafalkan posisi warna pada kisi, lalu pilih hanya ubin dengan <strong className="text-slate-900 font-bold">Warna Target</strong> saat kartu tertutup. <span className="text-rose-600 font-bold">Tanpa sistem nyawa</span> — satu kesalahan langsung mengakhiri sesi.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Mulai Kisi 3x3 • 2 Warna
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                Skala Progresif hingga 6x6
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Eliminasi Seketika (1-Strike)
              </span>
            </div>

            <AppButton
              id="start-color-memory-test-button"
              label="MULAI TANTANGAN"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={() => setIsCountdownOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </div>
        )}

        {/* Phase: ACTIVE GAME (memorize, recall, level_cleared) */}
        {(phase === 'memorize' || phase === 'recall' || phase === 'level_cleared') &&
          levelConfig && (
            <div
              className={`w-full ${arenaMaxWidth} flex flex-col items-center gap-3 sm:gap-4 relative z-10 animate-in fade-in duration-150`}
            >
              {/* Contextual Top Status Bar */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                      <span>Level {level}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300">
                        {levelConfig.gridSize}x{levelConfig.gridSize}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-pink-400">{levelConfig.colorCount} Warna</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {bestRecord !== null && (
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        Rekor: <strong className="text-slate-800 font-bold">Level {bestRecord}</strong>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border transition-all ${
                        phase === 'memorize'
                          ? 'bg-amber-50 text-amber-900 border-amber-300/80'
                          : phase === 'level_cleared'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300/80 animate-in zoom-in-95 duration-150'
                          : 'bg-indigo-50 text-indigo-900 border-indigo-300/80'
                      }`}
                    >
                      {phase === 'memorize' ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                          <span>Hafalkan Warna!</span>
                        </>
                      ) : phase === 'level_cleared' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Level Tuntas!</span>
                        </>
                      ) : (
                        <>
                          <Target className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                          <span>
                            Sisa:{' '}
                            <strong className="font-mono text-indigo-900">
                              {remainingTargets}
                            </strong>{' '}
                            / {levelConfig.targetCount}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                {phase === 'memorize' ? (
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-75 ease-linear"
                      style={{ width: `${memorizeProgress}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-200"
                      style={{
                        width: `${
                          phase === 'level_cleared'
                            ? 100
                            : (matchedCount / levelConfig.targetCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Target Spotlight Banner */}
              <AnimatePresence>
                {(phase === 'recall' || phase === 'level_cleared') && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="w-full rounded-2xl bg-white/95 border border-slate-200/90 shadow-xs p-2.5 sm:p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-white shadow-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: levelConfig.targetColor.hex,
                          boxShadow: `0 4px 14px ${levelConfig.targetColor.hex}44`,
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-white drop-shadow-xs" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          WARNA TARGET
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {levelConfig.targetColor.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10.5px] font-bold shrink-0">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="hidden sm:inline">Jangan Salah Pilih!</span>
                      <span className="sm:hidden">1 Strike</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Responsive Grid Stage */}
              <div
                className={`grid ${gridClasses} gap-2 sm:gap-2.5 w-full aspect-square p-2 sm:p-2.5 rounded-3xl bg-slate-200/40 border border-slate-200/80 shadow-inner`}
              >
                {tiles.map((tile) => {
                  const isFaceUp =
                    phase === 'memorize' ||
                    tile.isMatched ||
                    tile.isWrong ||
                    (tile.isRevealed && phase === 'recall');

                  return (
                    <motion.button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileClick(tile)}
                      disabled={phase !== 'recall' || tile.isMatched || tile.isWrong}
                      whileHover={phase === 'recall' && !tile.isMatched ? { scale: 1.04 } : {}}
                      whileTap={phase === 'recall' && !tile.isMatched ? { scale: 0.94 } : {}}
                      animate={
                        tile.isWrong
                          ? {
                              x: [-8, 8, -6, 6, -3, 3, 0],
                              scale: [1, 1.08, 1],
                              transition: { duration: 0.4 },
                            }
                          : {}
                      }
                      className={`relative w-full h-full rounded-xl sm:rounded-2xl transition-all duration-150 flex items-center justify-center select-none cursor-pointer overflow-hidden border ${
                        tile.isWrong
                          ? 'border-rose-500 ring-4 ring-rose-400/30 shadow-lg z-20'
                          : tile.isMatched
                          ? 'border-emerald-400/80 ring-2 ring-emerald-400/30 shadow-xs'
                          : isFaceUp
                          ? `${tile.color.twBorder} shadow-xs`
                          : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-indigo-300 active:bg-indigo-50/50'
                      }`}
                      style={{
                        backgroundColor: isFaceUp ? tile.color.hex : undefined,
                      }}
                    >
                      {!isFaceUp && (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300/80 transition-colors" />
                        </div>
                      )}

                      {tile.isMatched && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 stroke-[3]" />
                        </motion.div>
                      )}

                      {tile.isWrong && (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-600 shadow-md flex items-center justify-center text-white">
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

        {/* Phase: GAME OVER */}
        {phase === 'game_over' &&
          (() => {
            const finalScore = Math.max(1, level - 1);
            const tierEval = evaluateScoreTier('color_memory', finalScore);
            const isNewRec = bestRecord !== null ? finalScore > bestRecord : false;

            return (
              <GameResultView
                modeTitle="Memori Kromatik"
                subModeLabel={`Level ${finalScore} Tuntas • Rekor Retensi Spasial`}
                primaryScore={finalScore}
                scoreUnit="Level"
                isNewRecord={isNewRec}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Memori Kromatik'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'level',
                    label: 'Level Tertinggi Tuntas',
                    value: `Level ${finalScore}`,
                    highlight: true,
                  },
                  {
                    id: 'grid',
                    label: 'Matriks Terakhir',
                    value: levelConfig
                      ? `${levelConfig.gridSize}x${levelConfig.gridSize} (${levelConfig.totalTiles} Ubin)`
                      : '-',
                  },
                  {
                    id: 'colors',
                    label: 'Jumlah Warna',
                    value: levelConfig ? `${levelConfig.colorCount} Warna` : '-',
                  },
                  {
                    id: 'target',
                    label: 'Target Warna Terakhir',
                    value: levelConfig ? levelConfig.targetColor.name : '-',
                  },
                ]}
                onBackToMenu={onBackToMenu}
                onRetry={handleRestartToPreparation}
              />
            );
          })()}
      </main>

      {/* 3. Bottom Preparation Footer (Shown ONLY in IDLE state) */}
      {phase === 'idle' && (
        <ModePreparationFooter
          mode="color_memory"
          bestRecord={bestRecord}
          unit="Level"
          onOpenStandards={() => {
            setInfoTab('standards');
            setIsInfoOpen(true);
          }}
          onOpenRecord={() => setIsRecordOpen(true)}
        />
      )}

      {/* 4. Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Memori Kromatik"
        accentColor="indigo"
      />

      {/* 5. Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="color_memory"
        initialTab={infoTab}
      />

      {/* 6. Catatan Riwayat & Rekor Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="color_memory"
        modeTitle="Memori Kromatik"
        unit="Level"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};
