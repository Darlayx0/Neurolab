import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScaleShape,
  ScalePair,
  ScaleTrialConfig,
  ScaleSessionSummary,
} from '../../types';
import {
  generateScaleTrial,
  getLevelDifficultyInfo,
} from '../../utils/logicScaleGenerator';
import { playSuccessChime, playErrorBuzz, playTactileClick } from '../../utils/audio';
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
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface LogicScaleModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

type LogicScaleGameState = 'idle' | 'active' | 'completed';

/**
 * Komponen Renderer Bentuk Geometris Berwarna untuk Kartu Pilihan
 */
export const ShapeCardBadge: React.FC<{
  shape: ScaleShape;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ shape, size = 'sm', className = '' }) => {
  const sizeMap = {
    sm: { container: 'w-7 h-7 sm:w-8 sm:h-8', svg: 'w-4.5 h-4.5 sm:w-5 sm:h-5' },
    md: { container: 'w-9 h-9 sm:w-10 sm:h-10', svg: 'w-6 h-6' },
    lg: { container: 'w-11 h-11 sm:w-12 sm:h-12', svg: 'w-7 h-7 sm:w-8 sm:h-8' },
  };

  const currentSize = sizeMap[size];

  const renderSvgContent = () => {
    switch (shape.id) {
      case 'circle':
        return <circle cx="16" cy="16" r="11" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      case 'square':
        return <rect x="5.5" y="5.5" width="21" height="21" rx="4" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      case 'triangle':
        return <polygon points="16,4 28,26 4,26" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      case 'diamond':
        return <polygon points="16,3 29,16 16,29 3,16" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      case 'hexagon':
        return <polygon points="16,4 27,10 27,22 16,28 5,22 5,10" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      case 'star':
        return (
          <polygon
            points="16,3 19.5,12 29,12 21.5,18 24.5,27 16,22 7.5,27 10.5,18 3,12 12.5,12"
            fill={shape.hexFill}
            stroke={shape.hexBorder}
            strokeWidth="2"
          />
        );
      case 'cylinder':
        return <rect x="7" y="5" width="18" height="22" rx="6" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
      default:
        return <circle cx="16" cy="16" r="11" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="2" />;
    }
  };

  return (
    <div
      className={`rounded-xl flex items-center justify-center shadow-2xs border transition-all duration-150 ${currentSize.container} ${shape.bgColor}/10 ${shape.borderColor} ${className}`}
      title={shape.name}
    >
      <svg viewBox="0 0 32 32" className={`${currentSize.svg} drop-shadow-2xs`} xmlns="http://www.w3.org/2000/svg">
        {renderSvgContent()}
      </svg>
    </div>
  );
};

/**
 * Render Simbol Geometri di Dalam SVG Timbangan
 */
const SVGShapeElement: React.FC<{ shape: ScaleShape }> = ({ shape }) => {
  switch (shape.id) {
    case 'circle':
      return <circle cx="0" cy="0" r="8.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'square':
      return <rect x="-7.5" y="-7.5" width="15" height="15" rx="3" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'triangle':
      return <polygon points="0,-8.5 8.5,7 -8.5,7" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'diamond':
      return <polygon points="0,-9 9,0 0,9 -9,0" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'hexagon':
      return <polygon points="0,-9 7.5,-4.5 7.5,4.5 0,9 -7.5,4.5 -7.5,-4.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'star':
      return (
        <polygon
          points="0,-9 2.4,-2.8 9,-2.8 3.8,1.2 5.8,7.5 0,3.6 -5.8,7.5 -3.8,1.2 -9,-2.8 -2.4,-2.8"
          fill={shape.hexFill}
          stroke={shape.hexBorder}
          strokeWidth="1.5"
        />
      );
    case 'cylinder':
      return <rect x="-6" y="-8" width="12" height="16" rx="4" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    default:
      return <circle cx="0" cy="0" r="8.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
  }
};

/**
 * Komponen Visual Neraca Timbangan Bebas Overflow Berbasis Pure Vector SVG
 */
const BalanceScaleSVG: React.FC<{
  pair: ScalePair;
  scaleNumber: number;
}> = ({ pair, scaleNumber }) => {
  const isLeftHeavier = pair.tilt === 'left';

  // Geometri matematis terpadu (viewBox="0 0 200 130")
  const cx = 100;
  const cy = 35;
  const beamHalfLength = 65;
  const deltaY = 12; // Sudut kemiringan balok

  const x1 = cx - beamHalfLength; // 35
  const y1 = isLeftHeavier ? cy + deltaY : cy - deltaY; // 47 (turun) atau 23 (naik)

  const x2 = cx + beamHalfLength; // 165
  const y2 = isLeftHeavier ? cy - deltaY : cy + deltaY; // 23 (naik) atau 47 (turun)

  const stringLen = 25;
  const panDropY = 5;

  const leftPanY = y1 + stringLen;
  const rightPanY = y2 + stringLen;

  // Titik tengah bentuk di atas piringan
  const leftShapeX = x1;
  const leftShapeY = leftPanY - 8.5;

  const rightShapeX = x2;
  const rightShapeY = rightPanY - 8.5;

  return (
    <div className="flex flex-col items-center p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all select-none w-full">
      {/* Header Kartu Neraca */}
      <div className="w-full flex items-center justify-between mb-0.5">
        <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
          NERACA #{scaleNumber}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          isLeftHeavier ? 'text-blue-700 bg-blue-50 border border-blue-100' : 'text-indigo-700 bg-indigo-50 border border-indigo-100'
        }`}>
          {isLeftHeavier ? 'Kiri Lebih Berat' : 'Kanan Lebih Berat'}
        </span>
      </div>

      {/* SVG Canvas Utuh: Responsif, Presisi, & Bebas Potongan */}
      <svg
        viewBox="0 0 200 130"
        className="w-full h-auto max-h-[130px] drop-shadow-2xs overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Papan Dasar (Base) & Tiang Penopang Tengah */}
        <rect x="66" y="122" width="68" height="6.5" rx="3.25" fill="#334155" />
        <rect x="97.5" y="34" width="5" height="88" fill="#475569" />

        {/* Titik Engsel Segitiga (Fulcrum Pin) */}
        <polygon points="100,28 92,42 108,42" fill="#1e293b" />

        {/* Tali Gantungan Kiri */}
        <line x1={x1} y1={y1} x2={x1 - 14} y2={leftPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={x1} y1={y1} x2={x1 + 14} y2={leftPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Piringan Neraca Kiri */}
        <path
          d={`M ${x1 - 16} ${leftPanY} Q ${x1} ${leftPanY + panDropY} ${x1 + 16} ${leftPanY}`}
          fill="#475569"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Tali Gantungan Kanan */}
        <line x1={x2} y1={y2} x2={x2 - 14} y2={rightPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={x2} y1={y2} x2={x2 + 14} y2={rightPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Piringan Neraca Kanan */}
        <path
          d={`M ${x2 - 16} ${rightPanY} Q ${x2} ${rightPanY + panDropY} ${x2 + 16} ${rightPanY}`}
          fill="#475569"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Palang Timbangan Miring (Beam) */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#334155"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Pin Poros Pusat */}
        <circle cx={cx} cy={cy} r="4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />

        {/* Bentuk Kiri di Atas Piringan */}
        <g transform={`translate(${leftShapeX}, ${leftShapeY})`}>
          <SVGShapeElement shape={pair.leftShape} />
        </g>

        {/* Bentuk Kanan di Atas Piringan */}
        <g transform={`translate(${rightShapeX}, ${rightShapeY})`}>
          <SVGShapeElement shape={pair.rightShape} />
        </g>
      </svg>

      {/* Label Keterangan Sisi Kiri & Kanan */}
      <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-slate-700 mt-0.5 px-0.5 border-t border-slate-100 pt-1">
        <span className="truncate max-w-[48%] flex items-center gap-0.5">
          {isLeftHeavier ? (
            <span className="text-blue-600 font-black">▼</span>
          ) : (
            <span className="text-slate-400">▲</span>
          )}
          <span className="truncate">{pair.leftShape.name}</span>
        </span>
        <span className="truncate max-w-[48%] flex items-center gap-0.5 justify-end">
          <span className="truncate">{pair.rightShape.name}</span>
          {!isLeftHeavier ? (
            <span className="text-blue-600 font-black">▼</span>
          ) : (
            <span className="text-slate-400">▲</span>
          )}
        </span>
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

  // Status Progresi Level Murni (Sudden Death)
  const [level, setLevel] = useState<number>(1);

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

    const intervalStep = 50;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= intervalStep) {
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
   * Akhiri seluruh sesi permainan (Sudden Death: 1 Kesalahan / Timeout = Gugur)
   */
  const handleGameOver = useCallback((failedReason: 'wrong_answer' | 'timeout') => {
    clearActiveTimers();
    setGameState('completed');

    const totalRounds = totalRoundsRef.current;
    const correctCount = correctRoundsRef.current;
    const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;
    const avgRt = correctCount > 0 ? Math.round(totalReactionTimeMsRef.current / correctCount) : 0;

    // Level terselesaikan: jika gugur di level L, level yang tuntas adalah L - 1.
    const completedLevel = Math.max(0, level - 1);
    const saveResult = saveBestRecord('logic_scale', completedLevel);
    setIsNewBest(saveResult.isNewBest && completedLevel > 0);

    const reasonText = failedReason === 'timeout' ? 'Kehabisan Waktu' : 'Salah Menjawab';

    addHistoryItem({
      mode: 'logic_scale',
      primaryMetric: completedLevel,
      unit: 'Level',
      ratingLabel: `Level ${completedLevel}`,
      subMetric: `Gugur di Level ${level} (${reasonText}) • ${accuracy}% Akurasi`,
    });

    onRecordUpdated();

    setSummary({
      completedLevel,
      totalRoundsPlayed: totalRounds,
      correctRounds: correctCount,
      accuracyRate: accuracy,
      averageReactionTimeMs: avgRt,
      failedReason,
    });
  }, [level, onRecordUpdated]);

  /**
   * Menangani penalti saat waktu habis (Timeout - Sudden Death)
   */
  const handleTimeout = () => {
    if (isAnswerProcessedRef.current) return;
    isAnswerProcessedRef.current = true;

    totalRoundsRef.current += 1;
    setFeedbackState('timeout');
    playErrorBuzz();

    // Sudden Death: 1x kehabisan waktu = Langsung Gugur
    nextTrialTimeoutRef.current = setTimeout(() => {
      handleGameOver('timeout');
    }, 850);
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
      playSuccessChime();
      setFeedbackState('correct');
      correctRoundsRef.current += 1;
      totalReactionTimeMsRef.current += rt;

      const nextLevel = level + 1;
      setLevel(nextLevel);

      nextTrialTimeoutRef.current = setTimeout(() => {
        startNewTrial(nextLevel);
      }, 700);
    } else {
      playErrorBuzz();
      setFeedbackState('wrong');

      // Sudden Death: 1x salah jawab = Langsung Gugur
      nextTrialTimeoutRef.current = setTimeout(() => {
        handleGameOver('wrong_answer');
      }, 850);
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
  };

  // Evaluasi Tier untuk Skor Rekor Saat Ini (Terkalibrasi Akurat)
  const currentBestTier = evaluateScoreTier('logic_scale', bestRecord);
  const evaluatedTier = summary ? evaluateScoreTier('logic_scale', summary.completedLevel) : currentBestTier;

  // Metadata kesulitan level aktif
  const currentDifficultyMeta = getLevelDifficultyInfo(level);

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

      {/* 2. Main Arena Container (Mobile-First, Zero Unwanted Scroll) */}
      <main className="flex-1 max-w-4xl mx-auto px-3.5 sm:px-6 py-14 sm:py-16 w-full flex flex-col items-center justify-center">
        {/* ========================================================================= */}
        {/* FASE A: LAYAR PERSIAPAN (IDLE) - MOBILE-FIRST & TO THE POINT */}
        {/* ========================================================================= */}
        {gameState === 'idle' && (
          <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center animate-in fade-in duration-200 py-1">
            {/* Ikon Utama Modul Ringkas */}
            <div className="w-14 h-14 rounded-3xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs mb-2">
              <Scale className="w-7 h-7" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 font-mono">
              DEDUKSI LOGIKA MURNI
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 mb-1">
              Neraca Relasi Bobot
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-3 font-normal">
              Bandingkan kemiringan neraca secara deduktif untuk menentukan urutan bobot benda tanpa bias hafalan.
            </p>

            {/* Banner Aturan Sudden Death */}
            <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-[11px] font-semibold mb-2.5 shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Sudden Death: 1 Kesalahan / Waktu Habis = Gugur</span>
            </div>

            {/* Visual Rule Strip: Inti Mekanik dalam 2 Kolom Bersih */}
            <div className="w-full rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-2.5 mb-2.5 grid grid-cols-2 divide-x divide-slate-100 text-center">
              <div className="flex flex-col items-center gap-0.5 px-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9.5px] font-black uppercase tracking-wide">
                  <span>▼ Piringan Turun</span>
                </div>
                <span className="text-xs font-black text-slate-800 tracking-tight mt-0.5">LEBIH BERAT</span>
                <span className="text-[9.5px] text-slate-400">Beban ke bawah</span>
              </div>

              <div className="flex flex-col items-center gap-0.5 px-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9.5px] font-black uppercase tracking-wide">
                  <span>▲ Piringan Naik</span>
                </div>
                <span className="text-xs font-black text-slate-800 tracking-tight mt-0.5">LEBIH RINGAN</span>
                <span className="text-[9.5px] text-slate-400">Terangkat ke atas</span>
              </div>
            </div>

            {/* Status Rekor & Link Cepat ke Info Fase */}
            <div className="w-full p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-left">
                <TierBadge rank={currentBestTier.rank} size="sm" label={currentBestTier.tierName} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    REKOR TERTINGGI
                  </span>
                  <span className="text-sm font-black text-slate-900 leading-none mt-0.5">
                    {bestRecord ? `Level ${bestRecord}` : 'Belum Ada'}
                  </span>
                </div>
              </div>

              {/* Tombol Chip Cepat ke Panduan 4 Fase */}
              <button
                type="button"
                onClick={() => {
                  playTactileClick();
                  setInfoTab('guide');
                  setIsInfoOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/70 text-[10px] font-bold transition-all cursor-pointer select-none active:scale-95"
              >
                <Layers className="w-3 h-3 text-blue-500" />
                <span>4 Fase Level ⓘ</span>
              </button>
            </div>

            {/* Tombol Mulai Tantangan Langsung Terlihat (Zero Scroll) */}
            <div className="w-full">
              <AppButton
                label="MULAI TANTANGAN"
                variant="primary"
                icon={<Play className="w-4 h-4 fill-white" />}
                className="w-full py-3.5 text-sm sm:text-base font-bold shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 active:scale-95"
                onClick={() => {
                  playTactileClick();
                  setIsCountdownOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FASE B: GAMEPLAY AKTIF (ACTIVE) - INSTRUMEN PRESISI & RESPONSIF */}
        {/* ========================================================================= */}
        {gameState === 'active' && currentTrial && (
          <div className="w-full max-w-lg flex flex-col items-center animate-in fade-in duration-150">
            {/* Bar Informasi Atas: Level, Rentang Kesulitan, & Indikator Sudden Death */}
            <div className="w-full flex items-center justify-between gap-1.5 px-0.5 py-0.5 mb-1.5">
              {/* Badge Level & Deskripsi Rentang Kesulitan Aktif */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-black text-xs font-mono shrink-0">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>LVL {level}</span>
                </div>
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border truncate font-mono ${currentDifficultyMeta.badgeColor}`}>
                  {currentDifficultyMeta.stageBadge} • {currentDifficultyMeta.shapeCount} Benda
                </span>
              </div>

              {/* Indikator Mode Sudden Death */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/90 text-[9.5px] font-bold text-slate-600 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                  SUDDEN DEATH
                </span>
              </div>
            </div>

            {/* Bilah Hitung Mundur Waktu Ronde */}
            <div className="w-full h-1.5 bg-slate-200/90 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-75 ease-linear rounded-full ${
                  isTimeCritical ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'
                }`}
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>

            {/* Area Visual Neraca Timbangan Prosedural (SVG Murni, Sempurna di Mobile) */}
            <div className={`w-full grid gap-2 sm:gap-2.5 mb-3 ${
              currentTrial.scales.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
            }`}>
              {currentTrial.scales.map((pair, idx) => (
                <div
                  key={pair.id}
                  className={idx === 2 && currentTrial.scales.length === 3 ? 'col-span-2 sm:col-span-1 max-w-[210px] mx-auto w-full' : 'w-full'}
                >
                  <BalanceScaleSVG
                    pair={pair}
                    scaleNumber={idx + 1}
                  />
                </div>
              ))}
            </div>

            {/* Kartu Pertanyaan Dinamis dengan Penekanan Kata Kunci */}
            <div
              className={`w-full p-2.5 rounded-2xl border text-center transition-all duration-200 mb-3 ${
                feedbackState === 'correct'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/50'
                  : feedbackState === 'wrong'
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/50 animate-shake'
                  : feedbackState === 'timeout'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200/90 text-slate-900 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {feedbackState === 'correct' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
                )}
                {feedbackState === 'wrong' && (
                  <XCircle className="w-3.5 h-3.5 text-rose-600 animate-in zoom-in" />
                )}
                {feedbackState === 'timeout' && (
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-in zoom-in" />
                )}
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  {feedbackState === 'correct'
                    ? 'Logika Tepat!'
                    : feedbackState === 'wrong'
                    ? 'Kurang Tepat!'
                    : feedbackState === 'timeout'
                    ? 'Waktu Habis!'
                    : 'TUGAS DEDUKSI'}
                </span>
              </div>

              <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                {currentTrial.questionType === 'heaviest' && (
                  <>Benda manakah yang <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md font-black">PALING BERAT</span>?</>
                )}
                {currentTrial.questionType === 'lightest' && (
                  <>Benda manakah yang <span className="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md font-black">PALING RINGAN</span>?</>
                )}
                {currentTrial.questionType === 'median' && (
                  <>Benda manakah yang <span className="text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md font-black">BERBOBOT SEDANG</span>?</>
                )}
              </h2>
            </div>

            {/* Pilihan Opsi Jawaban (Simetris & Ergonomis di Mobile) */}
            <div className={`w-full grid gap-2 ${
              currentTrial.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
            }`}>
              {currentTrial.options.map((shape, idx) => {
                const isSelected = selectedShapeId === shape.id;
                const isTarget = currentTrial.correctShape.id === shape.id;

                let buttonStyle = 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs hover:shadow-xs';
                if (feedbackState !== 'none') {
                  if (isTarget) {
                    buttonStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/60 shadow-sm';
                  } else if (isSelected) {
                    buttonStyle = 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400/60 shadow-sm';
                  } else {
                    buttonStyle = 'opacity-35 bg-slate-100 border-slate-200';
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
                    className={`relative p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer active:scale-95 disabled:pointer-events-none min-h-[58px] sm:min-h-[64px] ${buttonStyle}`}
                  >
                    {/* Shortcut Badge [1..4] */}
                    <span className="absolute top-1 left-1.5 text-[8.5px] font-mono font-bold text-slate-400">
                      [{idx + 1}]
                    </span>

                    <ShapeCardBadge shape={shape} size="sm" />

                    <span className="text-[10.5px] sm:text-xs font-bold truncate max-w-full text-slate-800">
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
                id: 'completed_level',
                label: 'Level Terselesaikan',
                value: `Level ${summary.completedLevel}`,
                highlight: true,
              },
              {
                id: 'failed_at',
                label: 'Gugur Pada',
                value: `Level ${level} (${summary.failedReason === 'timeout' ? 'Waktu Habis' : 'Salah Jawab'})`,
              },
              {
                id: 'avg_rt',
                label: 'Rerata Respon',
                value: `${(summary.averageReactionTimeMs / 1000).toFixed(2)}s`,
              },
              {
                id: 'accuracy',
                label: 'Akurasi Ronde',
                value: `${summary.accuracyRate}%`,
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
