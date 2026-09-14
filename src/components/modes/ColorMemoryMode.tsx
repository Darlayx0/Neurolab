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
  ShieldAlert,
  HelpCircle,
  Timer,
  Zap,
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
  if (gridSize === 5) baseDuration = 3700;
  if (gridSize === 6) baseDuration = 4300;

  const speedReduction = Math.min(600, ((level - 1) % 4) * 140);
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
    isMissedTarget: false,
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

  // KUNCI INPUT KETAT (Anti-Cheat & Lockout saat salah / transisi)
  const [isInputLocked, setIsInputLocked] = useState<boolean>(false);

  // Countdown memorasi visual
  const [memorizeProgress, setMemorizeProgress] = useState<number>(100);
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<string>('0.0');

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
      setIsInputLocked(false);
      const config = generateLevelConfig(targetLvl);
      const { tiles: generatedTiles, targetCount } = generateTilesForConfig(config);
      config.targetCount = targetCount;

      setLevelConfig(config);
      setTiles(generatedTiles);
      setMatchedCount(0);
      setMemorizeProgress(100);
      setRemainingTimeSeconds((config.memorizeDurationMs / 1000).toFixed(1));
      setPhase('memorize');

      memorizeStartTimestamp.current = performance.now();

      const duration = config.memorizeDurationMs;
      const animateProgress = () => {
        const elapsed = performance.now() - memorizeStartTimestamp.current;
        const remainingMs = Math.max(0, duration - elapsed);
        const remainingPct = (remainingMs / duration) * 100;

        setMemorizeProgress(remainingPct);
        setRemainingTimeSeconds((remainingMs / 1000).toFixed(1));

        if (elapsed < duration) {
          animationFrameRef.current = requestAnimationFrame(animateProgress);
        } else {
          setMemorizeProgress(0);
          setRemainingTimeSeconds('0.0');
        }
      };
      animationFrameRef.current = requestAnimationFrame(animateProgress);

      memorizeTimerRef.current = setTimeout(() => {
        setPhase('recall');
        setIsInputLocked(false);
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
    // 1. CEK KETAT ANTI-CHEAT: Tolak jika bukan fase recall, jika input terkunci, atau ubin sudah selesai
    if (phase !== 'recall' || isInputLocked || !levelConfig) return;
    if (tile.isMatched || tile.isWrong) return;

    const isTarget = tile.colorId === levelConfig.targetColor.id;

    if (isTarget) {
      // PILIHAN BENAR
      playTactileClick();
      const newMatched = matchedCount + 1;
      setMatchedCount(newMatched);

      setTiles((prev) =>
        prev.map((t) =>
          t.id === tile.id ? { ...t, isMatched: true, isRevealed: true } : t
        )
      );

      // Cek apakah seluruh ubin target telah ditemukan
      if (newMatched >= levelConfig.targetCount) {
        // KUNCI INPUT SEKETIKA AGAR TIDAK BISA DIKLIK LAGI SAAT LEVEL CLEAR
        setIsInputLocked(true);
        playSuccessChime();
        setPhase('level_cleared');

        const nextLevel = level + 1;
        transitionTimerRef.current = setTimeout(() => {
          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 1100);
      }
    } else {
      // SALAH KLIK! ATURAN TANPA NYAWA (SUDDEN DEATH)
      // 1. KUNCI INPUT SEKETIKA SECARA MUTLAK (Mencegah klik ubin lain / kecurangan)
      setIsInputLocked(true);
      clearAllTimers();
      playErrorBuzz();

      // 2. MASUK KE FASE REVIEW KEGAGALAN (failed_review)
      setPhase('failed_review');

      // 3. Buka ubin yang salah (tanda merah getar) dan sorot ubin target yang terlewat
      setTiles((prev) =>
        prev.map((t) => {
          if (t.id === tile.id) {
            return { ...t, isWrong: true, isRevealed: true };
          }
          if (t.colorId === levelConfig.targetColor.id && !t.isMatched) {
            return { ...t, isMissedTarget: true, isRevealed: true };
          }
          return t;
        })
      );

      // 4. Jeda review dramatis 1.3 detik, lalu transisi permanen ke GAME OVER
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
      }, 1300);
    }
  };

  const handleRestartToPreparation = () => {
    clearAllTimers();
    setIsCountdownOpen(false);
    setIsInputLocked(false);
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
        return 'max-w-[340px] sm:max-w-[450px]';
      default:
        return 'max-w-xs sm:max-w-sm';
    }
  }, [levelConfig]);

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden text-slate-900 bg-slate-50">
      {/* Dynamic Ambient Background Glow based on active state */}
      {levelConfig && (phase === 'recall' || phase === 'memorize' || phase === 'failed_review') && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-20 blur-3xl -z-10"
          style={{
            background:
              phase === 'failed_review'
                ? 'radial-gradient(circle at 50% 40%, #ef4444 0%, transparent 60%)'
                : `radial-gradient(circle at 50% 40%, ${levelConfig.targetColor.hex} 0%, transparent 60%)`,
          }}
        />
      )}

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

        {/* Phase: IDLE - Premium Preparation Screen */}
        {phase === 'idle' && (
          <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Hero Icon Box */}
            <div className="relative mb-4">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 p-[2px] shadow-lg shadow-pink-500/20">
                <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center text-pink-600">
                  <Boxes className="w-9 h-9 sm:w-10 sm:h-10 animate-pulse" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-amber-400 shadow-xs">
                ★
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Uji Memori Kromatik
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 px-2">
              Latih pengikatan fitur spasial dan spektrum visual. Hafalkan posisi warna pada kisi, lalu pilih hanya ubin yang sesuai dengan <strong className="text-slate-900 font-bold">Warna Target</strong>.
            </p>

            {/* Systematic Feature Highlights */}
            <div className="grid grid-cols-3 gap-2 w-full mb-6">
              <div className="p-2.5 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs flex flex-col items-center text-center">
                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Skala Grid</span>
                <span className="text-xs font-black text-slate-900">3x3 ➔ 6x6</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs flex flex-col items-center text-center">
                <div className="w-7 h-7 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Variasi</span>
                <span className="text-xs font-black text-slate-900">2 ➔ 8 Warna</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/80 border border-rose-200/80 bg-rose-50/40 shadow-2xs flex flex-col items-center text-center">
                <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase text-rose-500">Aturan</span>
                <span className="text-xs font-black text-rose-700">1-Strike Fail</span>
              </div>
            </div>

            {/* Micro Rule Caution Banner */}
            <div className="w-full p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-left flex items-start gap-2.5 mb-6 shadow-2xs">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-rose-900">
                <strong className="font-black text-rose-700">Aturan Tanpa Nyawa:</strong> Sekali mengetuk ubin di luar warna target, sesi langsung berakhir seketika tanpa toleransi klik lanjutan.
              </div>
            </div>

            <AppButton
              id="start-color-memory-test-button"
              label="MULAI TANTANGAN"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={() => setIsCountdownOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full transition-all active:scale-[0.99]"
            />
          </div>
        )}

        {/* Phase: ACTIVE GAME (memorize, recall, failed_review, level_cleared) */}
        {(phase === 'memorize' ||
          phase === 'recall' ||
          phase === 'failed_review' ||
          phase === 'level_cleared') &&
          levelConfig && (
            <div
              className={`w-full ${arenaMaxWidth} flex flex-col items-center gap-3 sm:gap-4 relative z-10 animate-in fade-in duration-150`}
            >
              {/* Contextual Top Status Bar */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex items-center justify-between px-1 text-xs">
                  {/* Left: Level & Grid & Colors Info */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono text-xs font-bold shadow-xs">
                      <span>Level {level}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">
                        {levelConfig.gridSize}x{levelConfig.gridSize}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-pink-400">{levelConfig.colorCount} Warna</span>
                    </div>
                  </div>

                  {/* Right: Rekor Terbaik & Phase Status */}
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
                          : phase === 'failed_review'
                          ? 'bg-rose-50 text-rose-900 border-rose-300 animate-pulse'
                          : 'bg-indigo-50 text-indigo-900 border-indigo-300/80'
                      }`}
                    >
                      {phase === 'memorize' ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                          <span>Hafalkan Warna! ({remainingTimeSeconds}s)</span>
                        </>
                      ) : phase === 'level_cleared' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Level Tuntas!</span>
                        </>
                      ) : phase === 'failed_review' ? (
                        <>
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Salah Pilih! Selesai</span>
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

                {/* Fluid Micro Progress Bar */}
                {phase === 'memorize' ? (
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-75 ease-linear"
                      style={{ width: `${memorizeProgress}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        phase === 'failed_review' ? 'bg-rose-600' : 'bg-indigo-600'
                      }`}
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
              <AnimatePresence mode="wait">
                {(phase === 'recall' ||
                  phase === 'level_cleared' ||
                  phase === 'failed_review') && (
                  <motion.div
                    key="target-banner"
                    initial={{ opacity: 0, y: -10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className={`w-full rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 border shadow-xs transition-colors ${
                      phase === 'failed_review'
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-white/95 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* 3D Swatch Glow Box */}
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border-2 border-white shadow-md flex items-center justify-center shrink-0 transition-transform"
                        style={{
                          backgroundColor: levelConfig.targetColor.hex,
                          boxShadow: `0 4px 16px ${levelConfig.targetColor.hex}50`,
                        }}
                      >
                        <Sparkles className="w-4 h-4 text-white drop-shadow-xs" />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          WARNA TARGET
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">
                          {levelConfig.targetColor.name}
                        </span>
                      </div>
                    </div>

                    {/* Right: Segmented Progress Beads Tracker */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: levelConfig.targetCount }).map((_, beadIdx) => {
                          const isDone = beadIdx < matchedCount;
                          return (
                            <div
                              key={beadIdx}
                              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-200 ${
                                isDone
                                  ? 'bg-emerald-500 ring-2 ring-emerald-300 scale-110 shadow-xs'
                                  : 'bg-slate-200 border border-slate-300'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* 1 Strike Alert Pill */}
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10.5px] font-bold border shrink-0 ${
                          phase === 'failed_review'
                            ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                        <span>{phase === 'failed_review' ? 'Eliminasi!' : '1 Strike'}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Responsive Grid Stage with Absolute Input Lock Guard */}
              <div
                className={`grid ${gridClasses} gap-2 sm:gap-2.5 w-full aspect-square p-2.5 sm:p-3 rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/90 shadow-lg relative ${
                  isInputLocked || phase === 'failed_review' || phase === 'level_cleared'
                    ? 'pointer-events-none'
                    : ''
                }`}
              >
                {tiles.map((tile) => {
                  const isFaceUp =
                    phase === 'memorize' ||
                    tile.isMatched ||
                    tile.isWrong ||
                    tile.isMissedTarget ||
                    (tile.isRevealed && (phase === 'recall' || phase === 'failed_review'));

                  return (
                    <motion.button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileClick(tile)}
                      disabled={
                        phase !== 'recall' ||
                        isInputLocked ||
                        tile.isMatched ||
                        tile.isWrong ||
                        phase === 'failed_review'
                      }
                      whileHover={
                        phase === 'recall' && !isInputLocked && !tile.isMatched
                          ? { scale: 1.05, y: -2 }
                          : {}
                      }
                      whileTap={
                        phase === 'recall' && !isInputLocked && !tile.isMatched
                          ? { scale: 0.94 }
                          : {}
                      }
                      animate={
                        tile.isWrong
                          ? {
                              x: [-12, 12, -9, 9, -5, 5, 0],
                              scale: [1, 1.1, 1],
                              transition: { duration: 0.45 },
                            }
                          : tile.isMissedTarget
                          ? {
                              scale: [1, 1.04, 1],
                              transition: { repeat: Infinity, duration: 0.8 },
                            }
                          : {}
                      }
                      className={`relative w-full h-full rounded-xl sm:rounded-2xl transition-all duration-150 flex items-center justify-center select-none overflow-hidden border ${
                        tile.isWrong
                          ? 'border-rose-600 ring-4 ring-rose-500/50 shadow-xl z-20 cursor-not-allowed'
                          : tile.isMissedTarget
                          ? 'border-dashed border-2 border-emerald-400 ring-4 ring-emerald-400/30 shadow-md z-10'
                          : tile.isMatched
                          ? 'border-emerald-400/90 ring-2 ring-emerald-400/30 shadow-xs'
                          : isFaceUp
                          ? `${tile.color.twBorder} shadow-xs`
                          : 'bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 border-slate-700 shadow-xs hover:border-indigo-400 cursor-pointer active:scale-95'
                      }`}
                      style={{
                        backgroundColor: isFaceUp ? tile.color.hex : undefined,
                        boxShadow: isFaceUp ? `0 4px 14px ${tile.color.hex}35` : undefined,
                      }}
                    >
                      {/* Face Down Card: Sleek Architectural Pattern */}
                      {!isFaceUp && (
                        <div className="w-full h-full flex items-center justify-center relative">
                          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-600/80 flex items-center justify-center transition-colors">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          </div>
                        </div>
                      )}

                      {/* Face Up: Matched Success Icon */}
                      {tile.isMatched && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600 stroke-[3]" />
                        </motion.div>
                      )}

                      {/* Face Up: Wrong Error Icon */}
                      {tile.isWrong && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-600 shadow-xl flex items-center justify-center text-white ring-2 ring-white"
                        >
                          <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3]" />
                        </motion.div>
                      )}

                      {/* Face Up: Missed Target Highlight Marker */}
                      {tile.isMissedTarget && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-emerald-700">
                          <Target className="w-4 h-4 stroke-[2.5]" />
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
                subModeLabel={`Level ${finalScore} Selesai • Rekor Retensi Spasial`}
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
                    label: 'Keragaman Spektrum',
                    value: levelConfig ? `${levelConfig.colorCount} Warna` : '-',
                  },
                  {
                    id: 'target',
                    label: 'Target Terakhir',
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
