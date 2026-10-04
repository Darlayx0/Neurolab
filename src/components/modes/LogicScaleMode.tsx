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
  DIFFICULTY_STAGES_LIST,
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
  Heart,
  Flame,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Shield,
  Layers,
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
}> = ({ shape, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { container: 'w-7 h-7 sm:w-8 sm:h-8', svg: 'w-5 h-5' },
    md: { container: 'w-10 h-10 sm:w-11 sm:h-11', svg: 'w-7 h-7' },
    lg: { container: 'w-12 h-12 sm:w-14 sm:h-14', svg: 'w-8 h-8 sm:w-9 sm:h-9' },
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
      className={`rounded-2xl flex items-center justify-center shadow-2xs border transition-all duration-150 ${currentSize.container} ${shape.bgColor}/10 ${shape.borderColor} ${className}`}
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
      return <circle cx="0" cy="0" r="9" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'square':
      return <rect x="-8" y="-8" width="16" height="16" rx="3.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'triangle':
      return <polygon points="0,-9.5 9,7.5 -9,7.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'diamond':
      return <polygon points="0,-9.5 9.5,0 0,9.5 -9.5,0" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'hexagon':
      return <polygon points="0,-9.5 8,-5 8,5 0,9.5 -8,5 -8,-5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    case 'star':
      return (
        <polygon
          points="0,-9.5 2.6,-3 9.5,-3 4,1.2 6.2,8 0,3.8 -6.2,8 -4,1.2 -9.5,-3 -2.6,-3"
          fill={shape.hexFill}
          stroke={shape.hexBorder}
          strokeWidth="1.5"
        />
      );
    case 'cylinder':
      return <rect x="-6.5" y="-8.5" width="13" height="17" rx="4.5" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
    default:
      return <circle cx="0" cy="0" r="9" fill={shape.hexFill} stroke={shape.hexBorder} strokeWidth="1.5" />;
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

  // Geometri matematis terpadu (viewBox="0 0 200 135")
  const cx = 100;
  const cy = 36;
  const beamHalfLength = 66;
  const deltaY = 13; // Derajat kemiringan vertikal

  const x1 = cx - beamHalfLength; // 34
  const y1 = isLeftHeavier ? cy + deltaY : cy - deltaY; // 49 (turun) atau 23 (naik)

  const x2 = cx + beamHalfLength; // 166
  const y2 = isLeftHeavier ? cy - deltaY : cy + deltaY; // 23 (naik) atau 49 (turun)

  const stringLen = 26;
  const panDropY = 6;

  const leftPanY = y1 + stringLen;
  const rightPanY = y2 + stringLen;

  // Titik tengah bentuk di atas piringan
  const leftShapeX = x1;
  const leftShapeY = leftPanY - 9.5;

  const rightShapeX = x2;
  const rightShapeY = rightPanY - 9.5;

  return (
    <div className="flex flex-col items-center p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all select-none w-full">
      {/* Header Kartu Neraca */}
      <div className="w-full flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
          NERACA #{scaleNumber}
        </span>
        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
          isLeftHeavier ? 'text-blue-700 bg-blue-50' : 'text-indigo-700 bg-indigo-50'
        }`}>
          {isLeftHeavier ? 'Kiri Lebih Berat' : 'Kanan Lebih Berat'}
        </span>
      </div>

      {/* SVG Canvas Utuh: Responsif, Presisi, & Bebas Potongan */}
      <svg
        viewBox="0 0 200 135"
        className="w-full h-auto max-h-[140px] drop-shadow-2xs overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Papan Dasar (Base) & Tiang Penopang Tengah */}
        <rect x="68" y="122" width="64" height="8" rx="4" fill="#334155" />
        <rect x="97" y="36" width="6" height="86" rx="2" fill="#475569" />

        {/* Titik Engsel Segitiga (Fulcrum Pin) */}
        <polygon points="100,28 92,44 108,44" fill="#1e293b" />

        {/* Tali Gantungan Kiri */}
        <line x1={x1} y1={y1} x2={x1 - 15} y2={leftPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={x1} y1={y1} x2={x1 + 15} y2={leftPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Piringan Neraca Kiri */}
        <path
          d={`M ${x1 - 18} ${leftPanY} Q ${x1} ${leftPanY + panDropY} ${x1 + 18} ${leftPanY}`}
          fill="#475569"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Tali Gantungan Kanan */}
        <line x1={x2} y1={y2} x2={x2 - 15} y2={rightPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={x2} y1={y2} x2={x2 + 15} y2={rightPanY} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Piringan Neraca Kanan */}
        <path
          d={`M ${x2 - 18} ${rightPanY} Q ${x2} ${rightPanY + panDropY} ${x2 + 18} ${rightPanY}`}
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
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Pin Poros Pusat */}
        <circle cx={cx} cy={cy} r="4.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />

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
      <div className="w-full flex items-center justify-between text-[10.5px] font-bold text-slate-700 mt-1 px-1 border-t border-slate-100 pt-1.5">
        <span className="truncate max-w-[48%] flex items-center gap-1">
          {isLeftHeavier ? (
            <span className="text-blue-600 font-black text-xs">▼ Berat</span>
          ) : (
            <span className="text-slate-400 text-xs">▲ Ringan</span>
          )}
          <span className="truncate">{pair.leftShape.name}</span>
        </span>
        <span className="truncate max-w-[48%] flex items-center gap-1 justify-end">
          <span className="truncate">{pair.rightShape.name}</span>
          {!isLeftHeavier ? (
            <span className="text-blue-600 font-black text-xs">▼ Berat</span>
          ) : (
            <span className="text-slate-400 text-xs">▲ Ringan</span>
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
      }, 750);
    } else {
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

      {/* 2. Main Arena Container */}
      <main className="flex-1 max-w-4xl mx-auto px-3.5 sm:px-6 py-14 sm:py-18 w-full flex flex-col items-center justify-center">
        {/* ========================================================================= */}
        {/* FASE A: LAYAR PERSIAPAN (IDLE) */}
        {/* ========================================================================= */}
        {gameState === 'idle' && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Ikon Utama Modul */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-xs mb-2.5">
              <Scale className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 font-mono">
              LOGIKA & DEDUKSI TRANSITIF
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5 mb-1.5">
              Neraca Relasi Bobot
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mb-5 font-normal">
              Uji representasi mental hierarki bobot tanpa bias hafalan. Bandingkan kemiringan neraca secara deduktif dan tentukan posisi benda sebelum waktu habis.
            </p>

            {/* Kartu Status Rekor Terbaik & Lencana Tier */}
            <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between mb-5">
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

            {/* Rentang Kesulitan & Progresi Level (Sangat Jelas & Terstruktur) */}
            <div className="w-full mb-5 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  RENTANG KESULITAN & PROGRESI LEVEL
                </span>
                <span className="text-[10.5px] font-bold text-blue-600 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> 4 Fase Progresif
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DIFFICULTY_STAGES_LIST.map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.tagColor}`}>
                        {stage.range} • {stage.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        ⏱️ {stage.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                      {stage.desc}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                      <span>📦 {stage.shapes}</span>
                      <span>•</span>
                      <span>⚖️ {stage.scales}</span>
                    </div>
                  </div>
                ))}
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
            {/* Bar Informasi Atas: Level, Rentang Kesulitan, Lives & Score */}
            <div className="w-full flex items-center justify-between gap-2 px-1 py-1 mb-2">
              {/* Badge Level & Deskripsi Rentang Kesulitan Aktif */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>LEVEL {level}</span>
                </div>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border truncate ${currentDifficultyMeta.badgeColor}`}>
                  {currentDifficultyMeta.stageName} • {currentDifficultyMeta.shapeCount} Benda ({currentDifficultyMeta.timeLimitSec}s)
                </span>
              </div>

              {/* Runtutan Streak, Skor & Nyawa */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {streak >= 2 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs animate-bounce">
                    <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{streak}x</span>
                  </div>
                )}
                <span className="font-mono text-xs font-bold text-slate-600">
                  {score}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((heartIndex) => (
                    <Heart
                      key={heartIndex}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-200 ${
                        heartIndex <= lives
                          ? 'fill-rose-500 text-rose-500 scale-100'
                          : 'fill-slate-200 text-slate-300 scale-90'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bilah Hitung Mundur Waktu Ronde */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3.5">
              <div
                className={`h-full transition-all duration-75 ease-linear rounded-full ${
                  isTimeCritical ? 'bg-rose-500' : 'bg-blue-500'
                }`}
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>

            {/* Area Visual Neraca Timbangan Prosedural (SVG Murni, Sempurna di Mobile) */}
            <div className={`w-full grid gap-2 sm:gap-3 mb-4 ${
              currentTrial.scales.length === 2 ? 'grid-cols-2 max-w-lg' : 'grid-cols-2 sm:grid-cols-3 max-w-xl'
            }`}>
              {currentTrial.scales.map((pair, idx) => (
                <div
                  key={pair.id}
                  className={idx === 2 && currentTrial.scales.length === 3 ? 'col-span-2 sm:col-span-1 max-w-[240px] mx-auto w-full' : 'w-full'}
                >
                  <BalanceScaleSVG
                    pair={pair}
                    scaleNumber={idx + 1}
                  />
                </div>
              ))}
            </div>

            {/* Kartu Pertanyaan Dinamis */}
            <div
              className={`w-full max-w-lg p-3 rounded-2xl border text-center transition-all duration-200 mb-3.5 ${
                feedbackState === 'correct'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/50'
                  : feedbackState === 'wrong'
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/50 animate-shake'
                  : feedbackState === 'timeout'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                {feedbackState === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in" />
                )}
                {feedbackState === 'wrong' && (
                  <XCircle className="w-4 h-4 text-rose-600 animate-in zoom-in" />
                )}
                {feedbackState === 'timeout' && (
                  <Clock className="w-4 h-4 text-amber-600 animate-in zoom-in" />
                )}
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {feedbackState === 'correct'
                    ? 'Benar! Logika Tepat'
                    : feedbackState === 'wrong'
                    ? 'Kurang Tepat!'
                    : feedbackState === 'timeout'
                    ? 'Waktu Habis!'
                    : 'TUGAS INFERENSI DEDUKTIF'}
                </span>
              </div>

              <h2 className="text-sm sm:text-base font-black tracking-tight">
                {currentTrial.questionPrompt}
              </h2>
            </div>

            {/* Pilihan Opsi Jawaban (Simetris: 3 Kolom untuk 3 Objek, 4 Kolom untuk 4 Objek) */}
            <div className={`w-full max-w-lg grid gap-2 sm:gap-2.5 ${
              currentTrial.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
            }`}>
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
                    className={`relative p-2.5 sm:p-3 rounded-2xl border shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 disabled:pointer-events-none ${buttonStyle}`}
                  >
                    {/* Shortcut Badge [1..4] */}
                    <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-slate-400">
                      [{idx + 1}]
                    </span>

                    <ShapeCardBadge shape={shape} size="md" />

                    <span className="text-[11px] sm:text-xs font-bold truncate max-w-full">
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
