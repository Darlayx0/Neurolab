import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { playStimulusBeep } from '../../utils/audio';

export interface UniversalCountdownProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel?: () => void;
  title?: string;
  accentColor?: 'fuchsia' | 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'slate' | 'violet';
}

const ACCENT_GLOWS = {
  fuchsia: 'bg-fuchsia-500/15',
  indigo: 'bg-indigo-500/15',
  emerald: 'bg-emerald-500/15',
  rose: 'bg-rose-500/15',
  amber: 'bg-amber-500/15',
  sky: 'bg-sky-500/15',
  slate: 'bg-slate-400/10',
  violet: 'bg-violet-500/15',
};

const RHYTHM_GUIDES = [
  'Siapkan pandangan & fokus',
  'Tenangkan refleks...',
  'Bersiap...',
  'Mulai sekarang!',
];

export const UniversalCountdown: React.FC<UniversalCountdownProps> = ({
  isOpen,
  onComplete,
  onCancel,
  title = 'Bersiap...',
  accentColor = 'indigo',
}) => {
  // Steps: 3 -> 2 -> 1 -> 'MULAI!'
  const [stepIndex, setStepIndex] = useState<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const glowStyle = ACCENT_GLOWS[accentColor] || ACCENT_GLOWS.indigo;

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    clearAllTimers();
    setStepIndex(0);
    if (onCancelRef.current) {
      onCancelRef.current();
    }
  }, [clearAllTimers]);

  // Keyboard shortcut listener for Escape (Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleCancel]);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      clearAllTimers();
      return;
    }

    setStepIndex(0);

    // Audio cue for 3
    playStimulusBeep(660, 0.12);

    // Step 0: 3 (0ms)
    // Step 1: 2 (800ms)
    // Step 2: 1 (1600ms)
    // Step 3: MULAI! (2400ms)
    // Complete at 3000ms

    const t1 = setTimeout(() => {
      setStepIndex(1);
      playStimulusBeep(770, 0.12);
    }, 800);

    const t2 = setTimeout(() => {
      setStepIndex(2);
      playStimulusBeep(880, 0.14);
    }, 1600);

    const t3 = setTimeout(() => {
      setStepIndex(3);
      playStimulusBeep(1174.66, 0.25);
    }, 2400);

    const t4 = setTimeout(() => {
      clearAllTimers();
      onCompleteRef.current();
    }, 3000);

    timerRef.current = t4;
    timeoutsRef.current = [t1, t2, t3, t4];

    return () => {
      clearAllTimers();
    };
  }, [isOpen, clearAllTimers]);

  if (!isOpen) return null;

  const steps = ['3', '2', '1', 'MULAI!'];
  const currentVal = steps[stepIndex] || '1';
  const isFinalStep = stepIndex === 3;
  const currentGuide = RHYTHM_GUIDES[stepIndex] || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hitung mundur persiapan"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none pointer-events-auto overflow-hidden"
    >
      {/* Soft Ambient Radial Glow behind the numeral */}
      <div
        className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full ${glowStyle} blur-3xl pointer-events-none -z-10`}
      />

      {/* Center Display: De-boxed, Giant Pure White Number */}
      <div className="flex flex-col items-center justify-center text-center relative z-10">
        {/* Title / Subtitle label */}
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white/70 mb-4 drop-shadow-sm"
        >
          {title}
        </motion.p>

        {/* Free-standing Giant Numeral without cards/containers */}
        <div className="relative min-h-[140px] sm:min-h-[180px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVal}
              initial={{ scale: 0.65, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.25, opacity: 0, y: -8 }}
              transition={{
                duration: isFinalStep ? 0.35 : 0.28,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`font-mono font-black select-none tracking-tight drop-shadow-2xl ${
                isFinalStep
                  ? 'text-5xl sm:text-7xl text-emerald-400 tracking-wider'
                  : 'text-8xl sm:text-9xl text-white'
              }`}
            >
              {currentVal}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dynamic Focus Guidance Text */}
        <motion.p
          key={`guide-${stepIndex}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs sm:text-sm font-medium text-white/80 mt-2 tracking-wide min-h-[20px]"
        >
          {currentGuide}
        </motion.p>

        {/* 3-segment progress indicator pills */}
        <div className="flex items-center gap-2 mt-6">
          {[0, 1, 2].map((idx) => {
            const isPassed = stepIndex >= idx;
            return (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  scale: isPassed ? 1 : 0.85,
                  opacity: isPassed ? 1 : 0.25,
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isPassed
                    ? 'w-7 bg-white shadow-xs'
                    : 'w-3.5 bg-white/30'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Ergonomic Bottom Cancel Button with Escape keyboard badge */}
      {onCancel && (
        <div className="absolute bottom-8 sm:bottom-10 left-0 right-0 flex flex-col items-center px-4 z-20">
          <button
            type="button"
            id="btn-countdown-cancel"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 text-white/90 hover:text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/15 transition-all duration-150 cursor-pointer shadow-lg active:scale-95 min-h-[44px]"
            aria-label="Batalkan hitungan mundur"
          >
            <X className="w-4 h-4 text-white/80 shrink-0" />
            <span>Batalkan</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/60 font-mono">
              Esc
            </kbd>
          </button>
        </div>
      )}
    </div>
  );
};

