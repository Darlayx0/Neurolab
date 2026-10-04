import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScaleShape,
  ScalePair,
  ScaleTrialConfig,
  ScaleSessionSummary,
  TierRank,
} from '../../types';
import { generateScaleTrial } from '../../utils/logicScaleGenerator';
import { playSuccessChime, playErrorBuzz, playTactileClick, playStimulusBeep } from '../../utils/audio';
import { saveBestRecord, addHistoryItem } from '../../utils/storage';
import { evaluateScoreTier } from '../../utils/tierSystem';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { TierBadge } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import {
  Scale,
  Play,
  Heart,
  Flame,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface LogicScaleModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type LogicScaleGameState = 'idle' | 'active' | 'completed';

/**
 * Komponen Renderer Bentuk Geometris Berwarna
 */
export const ShapeRenderer: React.FC<{
  shape: ScaleShape;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ shape, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { container: 'w-7 h-7 sm:w-8 sm:h-8', svg: 'w-5 h-5 sm:w-6 sm:h-6' },
    md: { container: 'w-10 h-10 sm:w-12 sm:h-12', svg: 'w-7 h-7 sm:w-9 sm:h-9' },
    lg: { container: 'w-13 h-13 sm:w-16 sm:h-16', svg: 'w-9 h-9 sm:w-12 sm:h-12' },
  };

  const currentSize = sizeMap[size];

  const renderSvgShape = () => {
    switch (shape.id) {
      case 'circle':
        return <circle cx="16" cy="16" r="12" fill="currentColor" />;
      case 'square':
        return <rect x="5" y="5" width="22" height="22" rx="4" fill="currentColor" />;
      case 'triangle':
        return <polygon points="16,4 28,26 4,26" fill="currentColor" />;
      case 'diamond':
        return <polygon points="16,3 29,16 16,29 3,16" fill="currentColor" />;
      case 'hexagon':
        return <polygon points="16,4 27,10 27,22 16,28 5,22 5,10" fill="currentColor" />;
      case 'star':
        return (
          <polygon
            points="16,3 19.5,12 29,12 21.5,18 24.5,27 16,22 7.5,27 10.5,18 3,12 12.5,12"
            fill="currentColor"
          />
        );
      case 'cylinder':
        return <rect x="7" y="5" width="18" height="22" rx="6" fill="currentColor" />;
      default:
        return <circle cx="16" cy="16" r="12" fill="currentColor" />;
    }
  };

  return (
    <div
      className={`rounded-2xl flex items-center justify-center shadow-xs border transition-all duration-150 ${currentSize.container} ${shape.bgColor}/15 ${shape.borderColor} ${shape.textColor} ${className}`}
      title={shape.name}
    >
      <svg
        viewBox="0 0 32 32"
        className={`${currentSize.svg} drop-shadow-xs`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {renderSvgShape()}
      </svg>
    </div>
  );
};

/**
 * Komponen Visual Neraca Timbangan Interaktif (SVG + CSS Dinamis)
 */
const BalanceScaleItem: React.FC<{
  pair: ScalePair;
  scaleNumber: number;
}> = ({ pair, scaleNumber }) => {
  // tilt: 'left' artinya benda kiri lebih berat (palang miring ke kiri / counter-clockwise)
  // tilt: 'right' artinya benda kanan lebih berat (palang miring ke kanan / clockwise)
  const isLeftHeavier = pair.tilt === 'left';
  const rotationDeg = isLeftHeavier ? -11 : 11;
  const leftOffsetY = isLeftHeavier ? 14 : -14;
  const rightOffsetY = isLeftHeavier ? -14 : 14;

  return (
    <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs backdrop-blur-xs select-none min-w-[155px] sm:min-w-[190px] flex-1 max-w-[240px]">
      {/* Label Indikator Neraca */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        Neraca #{scaleNumber}
      </span>

      {/* Area Timbangan SVG & Elemen Suspensi */}
      <div className="relative w-full h-32 sm:h-36 flex items-center justify-center overflow-visible">
        {/* Tiang Penopang & Titik Tumpu (Fulcrum) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center z-0">
          {/* Titik Engsel Segitiga (Fulcrum) */}
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-slate-700" />
          {/* Tiang Vertikal */}
          <div className="w-2.5 h-14 bg-slate-600 rounded-t-xs" />
          {/* Papan Dasar (Base) */}
          <div className="w-14 sm:w-16 h-3 bg-slate-800 rounded-full shadow-xs" />
        </div>

        {/* Palang Bergerak (Beam) */}
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 w-[140px] sm:w-[165px] h-2 bg-slate-700 rounded-full transition-transform duration-300 ease-out z-10 flex items-center justify-between"
          style={{ transform: `translateX(-50%) rotate(${rotationDeg}deg)` }}
        >
          {/* Pivot Pin Tengah */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-400 shadow-xs" />

          {/* Gantungan Sisi Kiri */}
          <div
            className="absolute left-1 top-full flex flex-col items-center transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(${leftOffsetY}px) rotate(${-rotationDeg}deg)`,
            }}
          >
            {/* Tali Rantai Gantungan */}
            <div className="w-0.5 h-7 bg-slate-400/90" />
            {/* Bentuk Geometri di Atas Piringan */}
            <div className="mb-0.5 -mt-1 transform hover:scale-105 transition-transform">
              <ShapeRenderer shape={pair.leftShape} size="sm" />
            </div>
            {/* Piringan Neraca Kiri */}
            <div className="w-12 sm:w-14 h-2 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-b-xl shadow-xs border-t border-slate-400" />
          </div>

          {/* Gantungan Sisi Kanan */}
          <div
            className="absolute right-1 top-full flex flex-col items-center transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(${rightOffsetY}px) rotate(${-rotationDeg}deg)`,
            }}
          >
            {/* Tali Rantai Gantungan */}
            <div className="w-0.5 h-7 bg-slate-400/90" />
            {/* Bentuk Geometri di Atas Piringan */}
            <div className="mb-0.5 -mt-1 transform hover:scale-105 transition-transform">
              <ShapeRenderer shape={pair.rightShape} size="sm" />
            </div>
            {/* Piringan Neraca Kanan */}
            <div className="w-12 sm:w-14 h-2 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-b-xl shadow-xs border-t border-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const LogicScaleMode: React.FC<LogicScaleModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  const [gameState, setGameState] = useState<LogicScaleGameState>('idle');
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);

  // Status Permainan Bertingkat
  const [level, setLevel] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Konfigurasi Trial Aktif
  const [currentTrial, setCurrentTrial] = useState<ScaleTrialConfig | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'wrong' | 'timeout'>('none');

  // Waktu & Statistik Sesi
  const [timeLeftMs, setTimeLeftMs] = useState<number>(10000);
  const totalRoundsRef = useRef<number>(0);
  const correctRoundsRef = useRef<number>(0);
  const totalReactionTimeMsRef = useRef<number>(0);
  const trialStartTimeRef = useRef<number | null>(null);
  const isAnswerProcessedRef = useRef<boolean>(false);

  // Timer Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextTrialTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal Dialogs
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const [summary, setSummary] = useState<ScaleSessionSummary | null>(null);

  // Bersihkan semua timer aktif saat unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (nextTrialTimeoutRef.current) clearTimeout(nextTrialTimeoutRef.current);
    };
  }, []);

  const clearActiveTimers = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (nextTrialTimeoutRef.current) {
      clearTimeout(nextTrialTimeoutRef.current);
      nextTrialTimeoutRef.current = null;
    }
  };

  /**
   * Mulai ronde baru untuk level saat ini
   */
  const startNewTrial = useCallback((newLevel: number) => {
    clearActiveTimers();
    isAnswerProcessedRef.current = false;
    setSelectedShapeId(null);
    setFeedbackState('none');

    const trial = generateScaleTrial(newLevel, totalRoundsRef.current + 1);
    setCurrentTrial(trial);
    setTimeLeftMs(trial.timeoutMs);
    trialStartTimeRef.current = Date.now();

    // Jalankan timer hitung mundur per milidetik
    const intervalStep = 50;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= intervalStep) {
          // Waktu habis!
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          handleTimeout();
          return 0;
        }
        return prev - intervalStep;
      });
    }, intervalStep);
  }, []);

  /**
   * Akhiri seluruh sesi permainan (Game Over)
   */
  const handleGameOver = useCallback(() => {
    clearActiveTimers();
    setGameState('completed');

    const totalRounds = totalRoundsRef.current;
    const correctCount = correctRoundsRef.current;
    const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;
    const avgRt = correctCount > 0 ? Math.round(totalReactionTimeMsRef.current / correctCount) : 0;

    // Evaluasi rekor baru (berdasarkan level tertinggi yang berhasil diselesaikan)
    const completedLevel = Math.max(1, level);
    const saveResult = saveBestRecord('logic_scale', completedLevel);
    setIsNewBest(saveResult.isNewBest);

    // Simpan ke riwayat lokal
    addHistoryItem({
      mode: 'logic_scale',
      primaryMetric: completedLevel,
      unit: 'Level',
      ratingLabel: `Level ${completedLevel}`,
      subMetric: `${accuracy}% Akurasi • ${score} Poin`,
    });

    onRecordUpdated();

    setSummary({
      completedLevel,
      totalRoundsPlayed: totalRounds,
      correctRounds: correctCount,
      accuracyRate: accuracy,
      averageReactionTimeMs: avgRt,
      bestStreak,
      totalScore: score,
    });
  }, [level, score, bestStreak, onRecordUpdated]);

  /**
   * Menangani penalti saat waktu habis (Timeout)
   */
  const handleTimeout = () => {
    if (isAnswerProcessedRef.current) return;
    isAnswerProcessedRef.current = true;

    totalRoundsRef.current += 1;
    setFeedbackState('timeout');
    playErrorBuzz();

    setStreak(0);
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives <= 0) {
      nextTrialTimeoutRef.current = setTimeout(() => {
        handleGameOver();
      }, 1000);
    } else {
      nextTrialTimeoutRef.current = setTimeout(() => {
        startNewTrial(level);
      }, 1000);
    }
  };

  /**
   * Menangani pemilihan jawaban oleh pemain
   */
  const handleSelectAnswer = (chosenShape: ScaleShape) => {
    if (isAnswerProcessedRef.current || !currentTrial || gameState !== 'active') return;
    isAnswerProcessedRef.current = true;
    clearActiveTimers();

    const rt = Date.now() - (trialStartTimeRef.current || Date.now());
    totalRoundsRef.current += 1;
    setSelectedShapeId(chosenShape.id);

    const isCorrect = chosenShape.id === currentTrial.correctShape.id;

    if (isCorrect) {
      // JAWABAN BENAR
      playSuccessChime();
      setFeedbackState('correct');
      correctRoundsRef.current += 1;
      totalReactionTimeMsRef.current += rt;

      // Hitung skor poin: Base 100 + bonus sisa waktu + bonus streak
      const timeBonus = Math.round((timeLeftMs / currentTrial.timeoutMs) * 50);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const addedScore = 100 + timeBonus + newStreak * 10;
      setScore((prev) => prev + addedScore);

      // Naik level ke tantangan berikutnya
      const nextLevel = level + 1;
      setLevel(nextLevel);

      nextTrialTimeoutRef.current = setTimeout(() => {
        startNewTrial(nextLevel);
      }, 800);
    } else {
      // JAWABAN SALAH
      playErrorBuzz();
      setFeedbackState('wrong');
      setStreak(0);

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        nextTrialTimeoutRef.current = setTimeout(() => {
          handleGameOver();
        }, 1000);
      } else {
        nextTrialTimeoutRef.current = setTimeout(() => {
          startNewTrial(level);
        }, 1000);
      }
    }
  };

  /**
   * Dukungan Keyboard Shortcut (Tombol 1, 2, 3, 4)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'active' || !currentTrial || isAnswerProcessedRef.current) return;
      const key = e.key;
      const num = parseInt(key, 10);
      if (!isNaN(num) && num >= 1 && num <= currentTrial.options.length) {
        e.preventDefault();
        playTactileClick();
        handleSelectAnswer(currentTrial.options[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentTrial]);

  /**
   * Memulai game dari Countdown
   */
  const handleStartGame = () => {
    setIsCountdownOpen(false);
    setGameState('active');
    setLevel(1);
    setLives(3);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    totalRoundsRef.current = 0;
    correctRoundsRef.current = 0;
    totalReactionTimeMsRef.current = 0;
    startNewTrial(1);
  };

  const handleRestartToPreparation = () => {
    clearActiveTimers();
    setGameState('idle');
    setCurrentTrial(null);
    setLevel(1);
    setLives(3);
    setScore(0);
    setStreak(0);
  };

  // Evaluasi Tier untuk Skor Rekor Saat Ini
  const currentBestTier = evaluateScoreTier('logic_scale', bestRecord);
  const evaluatedTier = summary ? evaluateScoreTier('logic_scale', summary.completedLevel) : currentBestTier;

  // Persentase sisa waktu untuk progress bar
  const timeProgressPercent = currentTrial ? Math.max(0, Math.min(100, (timeLeftMs / currentTrial.timeoutMs) * 100)) : 100;
  const isTimeCritical = timeProgressPercent <= 30;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-between bg-slate-50 text-slate-900 select-none">
      {/* 1. Universal In-Game HUD Header */}
      <InGameHUD
        title="Neraca Relasi Bobot"
        isGameActive={gameState === 'active'}
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

      {/* 2. Main Arena Container */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 sm:py-20 w-full flex flex-col items-center justify-center">
        {/* ========================================================================= */}
        {/* FASE A: LAYAR PERSIAPAN (IDLE) */}
        {/* ========================================================================= */}
        {gameState === 'idle' && (
          <div className="w-full max-w-md mx-auto flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Ikon Utama Modul */}
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-xs mb-3">
              <Scale className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 font-mono">
              LOGIKA & DEDUKSI MURNI
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              Neraca Relasi Bobot
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
              Uji inferensi transitif korteks prefrontal. Bandingkan kemiringan neraca secara mental dan deduksi benda teringan atau terberat tanpa bias hafalan.
            </p>

            {/* Kartu Status Rekor Terbaik & Lencana Tier */}
            <div className="w-full p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between mb-6">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  REKOR TERTINGGI
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                  {bestRecord ? `Level ${bestRecord}` : 'Belum Ada'}
                </span>
              </div>
              <TierBadge rank={currentBestTier.rank} size="sm" label={currentBestTier.tierName} />
            </div>

            {/* Ringkasan Peraturan Gameplay */}
            <div className="w-full grid grid-cols-3 gap-2.5 mb-6 text-left">
              <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  ⚖️ Amati
                </span>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                  Sisi turun = lebih berat.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  ❤️ 3 Nyawa
                </span>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                  Salah/habis waktu kurangi nyawa.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  ⚡ Prosedural
                </span>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                  100% acak & kebal hafalan.
                </p>
              </div>
            </div>

            {/* Tombol Mulai Tantangan */}
            <div className="w-full">
              <AppButton
                label="MULAI TANTANGAN"
                variant="primary"
                icon={<Play className="w-4 h-4 fill-white" />}
                className="w-full py-3.5 text-sm sm:text-base font-bold shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  playTactileClick();
                  setIsCountdownOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FASE B: GAMEPLAY AKTIF (ACTIVE) */}
        {/* ========================================================================= */}
        {gameState === 'active' && currentTrial && (
          <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in duration-150">
            {/* Bar Informasi Atas: Level, Streak, Lives & Score */}
            <div className="w-full flex items-center justify-between gap-2 px-2 py-1 mb-3">
              {/* Badge Level */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>LEVEL {level}</span>
              </div>

              {/* Runtutan Streak & Skor */}
              <div className="flex items-center gap-3">
                {streak >= 2 && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs animate-bounce">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{streak}x STREAK</span>
                  </div>
                )}
                <span className="font-mono text-xs font-bold text-slate-600">
                  {score} Poin
                </span>
              </div>

              {/* Indikator 3 Nyawa */}
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((heartIndex) => (
                  <Heart
                    key={heartIndex}
                    className={`w-4 h-4 transition-all duration-200 ${
                      heartIndex <= lives
                        ? 'fill-rose-500 text-rose-500 scale-100'
                        : 'fill-slate-200 text-slate-300 scale-90'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Bilah Hitung Mundur Waktu Ronde */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full transition-all duration-75 ease-linear rounded-full ${
                  isTimeCritical ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>

            {/* Area Visual Neraca Timbangan Prosedural */}
            <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-5">
              {currentTrial.scales.map((pair, idx) => (
                <BalanceScaleItem
                  key={pair.id}
                  pair={pair}
                  scaleNumber={idx + 1}
                />
              ))}
            </div>

            {/* Kartu Pertanyaan Dinamis */}
            <div
              className={`w-full max-w-lg p-3 sm:p-4 rounded-2xl border text-center transition-all duration-200 mb-4 ${
                feedbackState === 'correct'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/50'
                  : feedbackState === 'wrong'
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/50 animate-shake'
                  : feedbackState === 'timeout'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {feedbackState === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in" />
                )}
                {feedbackState === 'wrong' && (
                  <XCircle className="w-4 h-4 text-rose-600 animate-in zoom-in" />
                )}
                {feedbackState === 'timeout' && (
                  <Clock className="w-4 h-4 text-amber-600 animate-in zoom-in" />
                )}
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                  {feedbackState === 'correct'
                    ? 'Benar! Logika Sempurna'
                    : feedbackState === 'wrong'
                    ? 'Kurang Tepat!'
                    : feedbackState === 'timeout'
                    ? 'Waktu Habis!'
                    : 'TUGAS INFERENSI DEDUKTIF'}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {currentTrial.questionPrompt}
              </h2>
            </div>

            {/* Pilihan Opsi Jawaban (Keyboard Shortcuts: 1, 2, 3, 4) */}
            <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {currentTrial.options.map((shape, idx) => {
                const isSelected = selectedShapeId === shape.id;
                const isTarget = currentTrial.correctShape.id === shape.id;

                let buttonStyle = 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800';
                if (feedbackState !== 'none') {
                  if (isTarget) {
                    buttonStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/60';
                  } else if (isSelected) {
                    buttonStyle = 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400/60';
                  } else {
                    buttonStyle = 'opacity-40 bg-slate-100 border-slate-200';
                  }
                }

                return (
                  <button
                    key={shape.id}
                    type="button"
                    disabled={feedbackState !== 'none'}
                    onClick={() => {
                      playTactileClick();
                      handleSelectAnswer(shape);
                    }}
                    className={`relative p-3 rounded-2xl border shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 disabled:pointer-events-none ${buttonStyle}`}
                  >
                    {/* Shortcut Badge [1..4] */}
                    <span className="absolute top-1.5 left-2 text-[9.5px] font-mono font-bold text-slate-400">
                      [{idx + 1}]
                    </span>

                    <ShapeRenderer shape={shape} size="md" />

                    <span className="text-xs font-bold truncate max-w-full">
                      {shape.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FASE C: GAME OVER / HASIL SESI (COMPLETED) */}
        {/* ========================================================================= */}
        {gameState === 'completed' && summary && (
          <GameResultView
            modeTitle="Neraca Relasi Bobot"
            subModeLabel="Penalaran Deduktif & Transitif"
            primaryScore={`Level ${summary.completedLevel}`}
            isNewRecord={isNewBest}
            tierRank={evaluatedTier.rank}
            tierName={evaluatedTier.tierName}
            tierCaption={evaluatedTier.badgeLabel}
            tierDescription={evaluatedTier.desc}
            stats={[
              {
                id: 'accuracy',
                label: 'Akurasi Deduksi',
                value: `${summary.accuracyRate}%`,
                highlight: true,
              },
              {
                id: 'score',
                label: 'Total Skor Poin',
                value: `${summary.totalScore} Poin`,
              },
              {
                id: 'avg_rt',
                label: 'Rerata Respon',
                value: `${(summary.averageReactionTimeMs / 1000).toFixed(2)}s`,
              },
              {
                id: 'streak',
                label: 'Runtutan Terbaik',
                value: `${summary.bestStreak}x Benar`,
              },
            ]}
            onBackToMenu={onBackToMenu}
            onRetry={handleRestartToPreparation}
            retryLabel="Kembali ke Persiapan"
          />
        )}
      </main>

      {/* 3. Universal Countdown Modal */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleStartGame}
        onCancel={() => setIsCountdownOpen(false)}
        title="Bersiap Deduksi Logika..."
        accentColor="indigo"
      />

      {/* 4. Modal Panduan & Standar Tier */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="logic_scale"
        initialTab={infoTab}
      />

      {/* 5. Modal Rekor Pribadi */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="logic_scale"
        title="Neraca Relasi Bobot"
        unit="Level"
        onRecordsUpdated={onRecordUpdated}
      />
    </div>
  );
};
