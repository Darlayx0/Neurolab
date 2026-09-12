import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrackingBall, TrackingPhase } from '../../types';
import {
  saveBestRecord,
  addHistoryItem,
  getTrackingLevelConfig,
  getTrackingEvaluation,
  EvaluationResult,
} from '../../utils/storage';
import {
  playTactileClick,
  playSelectionTap,
  playDeselectTap,
  playQuotaLockCue,
  playTargetHighlightCue,
  playMotionWhoosh,
  playBallsHaltCue,
  playLevelClearFanfare,
  playSuddenDeathImpact,
  playNewRecordCelebration,
  playButtonPress,
  playCollisionTap,
} from '../../utils/audio';
import {
  ScanEye,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Award,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { InGameHUD } from '../common/InGameHUD';
import { ModeInfoModal } from '../common/ModeInfoModal';
import { ModeRecordModal } from '../common/ModeRecordModal';
import { AppButton } from '../common/AppButton';
import { ModePreparationFooter } from '../common/TierBadge';
import { UniversalCountdown } from '../common/UniversalCountdown';
import { GameResultView } from '../common/GameResultView';
import { evaluateScoreTier } from '../../utils/tierSystem';

interface CollisionSpark {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface VisualTrackingModeProps {
  bestRecord: number | null;
  onRecordUpdated: () => void;
  onBackToMenu: () => void;
}

export const VisualTrackingMode: React.FC<VisualTrackingModeProps> = ({
  bestRecord,
  onRecordUpdated,
  onBackToMenu,
}) => {
  // Game states
  const [phase, setPhase] = useState<TrackingPhase>('idle');
  const [isCountdownOpen, setIsCountdownOpen] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [balls, setBalls] = useState<TrackingBall[]>([]);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [totalAccumulatedTimeMs, setTotalAccumulatedTimeMs] = useState<number>(0);
  const [isNewRecordEarned, setIsNewRecordEarned] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  // Modals & Dialogs
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'guide' | 'standards'>('guide');
  const [isRecordOpen, setIsRecordOpen] = useState<boolean>(false);

  // Virtual Coordinate Space for 100% distortion-free 4:5 vertical physics arena
  const VIRTUAL_WIDTH = 600;
  const VIRTUAL_HEIGHT = 750;
  const BALL_RADIUS = 20;

  // Dynamic screen-fitted arena dimensions (guarantees entire 4:5 arena fits 100% in viewport without scroll)
  const [arenaDimensions, setArenaDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const arenaWrapperRef = useRef<HTMLDivElement | null>(null);
  const arenaDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Refs for animation & canvas physics
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const ballsRef = useRef<TrackingBall[]>([]);
  const phaseRef = useRef<TrackingPhase>('idle');
  const levelStartTimeRef = useRef<number>(0);
  const canvasSizeRef = useRef<{ width: number; height: number }>({ width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT });
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Time & Pause tracking refs
  const phaseStartTimeRef = useRef<number>(0);
  const phaseDurationRef = useRef<number>(0);
  const phaseRemainingTimeRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number>(0);

  // Collision ripple particles ref
  const collisionSparksRef = useRef<CollisionSpark[]>([]);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Keep ballsRef in sync
  useEffect(() => {
    ballsRef.current = balls;
  }, [balls]);

  // Get active config for the current level
  const activeConfig = getTrackingLevelConfig(currentLevel);

  // Add spark effect helper
  const addCollisionSpark = useCallback((x: number, y: number, color = 'rgba(99, 102, 241, 0.85)') => {
    if (collisionSparksRef.current.length > 30) {
      collisionSparksRef.current.shift();
    }
    collisionSparksRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius: 18 + Math.random() * 6,
      alpha: 0.85,
      color,
    });
  }, []);

  // Clear running animation and timeouts
  const stopAnimation = useCallback(() => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Fixed virtual coordinate resolution setup mapped to physical screen size & device pixel ratio
  const updateCanvasDimensions = useCallback((customW?: number, customH?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = customW ?? arenaDimensionsRef.current.width;
    const h = customH ?? arenaDimensionsRef.current.height;
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    // Buffer pixels match the exact physical pixels of the container
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Scale virtual coordinates (800x600) into actual canvas buffer pixels
      const scale = (w * dpr) / VIRTUAL_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }

    canvasSizeRef.current = { width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT };
  }, []);

  // Render loop on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = VIRTUAL_WIDTH;
    const height = VIRTUAL_HEIGHT;

    const currentW = arenaDimensionsRef.current.width;
    if (currentW > 0) {
      const dpr = window.devicePixelRatio || 1;
      const scale = (currentW * dpr) / VIRTUAL_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }

    const currentPhase = phaseRef.current;

    // Clear background with crisp laboratory white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle inner arena boundary guideline
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Draw subtle, elegant dot grid pattern
    ctx.fillStyle = '#E2E8F0';
    const dotSpacing = 36;
    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw collision ripple shockwaves
    const currentSparks = collisionSparksRef.current;
    if (currentSparks.length > 0) {
      const activeSparks: CollisionSpark[] = [];
      for (let s = 0; s < currentSparks.length; s++) {
        const spark = currentSparks[s];
        ctx.save();
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
        ctx.strokeStyle = spark.color.replace(/[\d.]+\)$/, `${Math.max(0, spark.alpha).toFixed(2)})`);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        spark.radius += 0.8;
        spark.alpha -= 0.045;
        if (spark.alpha > 0.01 && spark.radius < spark.maxRadius) {
          activeSparks.push(spark);
        }
      }
      collisionSparksRef.current = activeSparks;
    }

    const currentBalls = ballsRef.current;

    // Draw all balls with 100% true circular geometry
    currentBalls.forEach((ball) => {
      ctx.save();

      // Determine colors based on phase and ball status
      let fillColor = '#475569'; // Modern Slate 600
      let strokeColor = '#1E293B'; // Slate 900
      let ringColor: string | null = null;
      let badgeChar: string | null = null;

      if (currentPhase === 'highlight') {
        if (ball.isTarget) {
          fillColor = '#F59E0B'; // Warm Amber
          strokeColor = '#B45309';
          ringColor = 'rgba(245, 158, 11, 0.45)';
          badgeChar = '★';
        } else {
          fillColor = '#64748B';
          strokeColor = '#334155';
        }
      } else if (currentPhase === 'moving') {
        fillColor = '#475569';
        strokeColor = '#1E293B';
      } else if (currentPhase === 'selecting') {
        if (ball.isSelected) {
          fillColor = '#6366F1'; // Modern Indigo
          strokeColor = '#4338CA';
          ringColor = 'rgba(99, 102, 241, 0.45)';
          badgeChar = '✓';
        } else {
          fillColor = '#475569';
          strokeColor = '#1E293B';
        }
      } else if (currentPhase === 'evaluating' || currentPhase === 'gameover') {
        if (ball.isSelected && ball.isTarget) {
          // Correct selection
          fillColor = '#10B981'; // Emerald
          strokeColor = '#047857';
          ringColor = 'rgba(16, 185, 129, 0.45)';
          badgeChar = '✓';
        } else if (ball.isSelected && !ball.isTarget) {
          // Wrong selection
          fillColor = '#F43F5E'; // Rose
          strokeColor = '#BE123C';
          ringColor = 'rgba(244, 63, 94, 0.45)';
          badgeChar = '✕';
        } else if (!ball.isSelected && ball.isTarget) {
          // Missed target
          fillColor = '#F59E0B';
          strokeColor = '#B45309';
          ringColor = 'rgba(245, 158, 11, 0.45)';
          badgeChar = '★';
        } else {
          fillColor = '#94A3B8';
          strokeColor = '#64748B';
        }
      }

      // Draw outer glowing aura ring for targets or selected balls
      if (ringColor) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Draw main sphere with smooth, modern lighting
      const grad = ctx.createRadialGradient(
        ball.x,
        ball.y - ball.radius * 0.35,
        ball.radius * 0.05,
        ball.x,
        ball.y,
        ball.radius
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.25, fillColor);
      grad.addColorStop(1, strokeColor);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle top inner arc highlight for clean, modern polish
      ctx.beginPath();
      ctx.arc(ball.x, ball.y - ball.radius * 0.22, ball.radius * 0.55, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Centered badge icon
      if (badgeChar) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeChar, ball.x, ball.y + 0.5);
      }

      ctx.restore();
    });
  }, []);

  // Calculate aspect-fit dimensions within available stage space (4:5 vertical ratio)
  const calculateArenaSize = useCallback(() => {
    const wrapper = arenaWrapperRef.current;
    if (!wrapper) return;

    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;
    if (availW <= 0 || availH <= 0) return;

    const padX = 8;
    const padY = 8;
    const maxW = Math.max(200, availW - padX);
    const maxH = Math.max(240, availH - padY);

    const ASPECT = VIRTUAL_WIDTH / VIRTUAL_HEIGHT; // 600 / 750 = 0.8

    let targetH = maxH;
    let targetW = targetH * ASPECT;

    if (targetW > maxW) {
      targetW = maxW;
      targetH = targetW / ASPECT;
    }

    // Limit maximum height on desktop screens so it fits comfortably within viewport
    if (targetH > 590) {
      targetH = 590;
      targetW = targetH * ASPECT;
    }

    const roundedW = Math.floor(targetW);
    const roundedH = Math.floor(targetH);

    arenaDimensionsRef.current = { width: roundedW, height: roundedH };
    setArenaDimensions({ width: roundedW, height: roundedH });
    updateCanvasDimensions(roundedW, roundedH);
    drawCanvas();
  }, [drawCanvas, updateCanvasDimensions]);

  // Responsive observer: dynamically compute arena aspect-fit dimensions and re-render canvas
  useEffect(() => {
    const wrapper = arenaWrapperRef.current;
    if (!wrapper) return;

    const ro = new ResizeObserver(() => {
      calculateArenaSize();
    });
    ro.observe(wrapper);

    calculateArenaSize();

    return () => {
      ro.disconnect();
      stopAnimation();
    };
  }, [calculateArenaSize, stopAnimation]);

  // Ensure arena recalculates when game stage mounts
  useEffect(() => {
    if (phase !== 'idle') {
      const timer = setTimeout(() => {
        calculateArenaSize();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [phase, calculateArenaSize]);

  // Tab visibility safety: halt animation when user switches tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (phaseRef.current === 'highlight' || phaseRef.current === 'moving' || phaseRef.current === 'selecting')) {
        stopAnimation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopAnimation]);

  // Physics animation loop with hard clamping and anti-stick impulse calculations
  const runPhysicsLoop = useCallback(() => {
    const width = VIRTUAL_WIDTH;
    const height = VIRTUAL_HEIGHT;
    const currentBalls = ballsRef.current;

    for (let i = 0; i < currentBalls.length; i++) {
      const b = currentBalls[i];

      // Move by vector
      b.x += b.vx;
      b.y += b.vy;

      // Hard boundary collision detection & correction (wall bounce horizontal)
      if (b.x - b.radius <= 0) {
        b.x = b.radius;
        b.vx = Math.abs(b.vx);
        addCollisionSpark(0, b.y, 'rgba(148, 163, 184, 0.85)');
        playCollisionTap(0.7);
      } else if (b.x + b.radius >= width) {
        b.x = width - b.radius;
        b.vx = -Math.abs(b.vx);
        addCollisionSpark(width, b.y, 'rgba(148, 163, 184, 0.85)');
        playCollisionTap(0.7);
      }

      // Hard boundary collision detection & correction (wall bounce vertical)
      if (b.y - b.radius <= 0) {
        b.y = b.radius;
        b.vy = Math.abs(b.vy);
        addCollisionSpark(b.x, 0, 'rgba(148, 163, 184, 0.85)');
        playCollisionTap(0.7);
      } else if (b.y + b.radius >= height) {
        b.y = height - b.radius;
        b.vy = -Math.abs(b.vy);
        addCollisionSpark(b.x, height, 'rgba(148, 163, 184, 0.85)');
        playCollisionTap(0.7);
      }

      // Ball-to-ball elastic collision with positional separation (anti-stick)
      for (let j = i + 1; j < currentBalls.length; j++) {
        const b2 = currentBalls[j];
        const dx = b2.x - b.x;
        const dy = b2.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = b.radius + b2.radius;

        if (dist < minDist && dist > 0.0001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Positional nudge (anti-stick): immediately separate the overlapping balls
          b.x -= nx * (overlap * 0.51);
          b.y -= ny * (overlap * 0.51);
          b2.x += nx * (overlap * 0.51);
          b2.y += ny * (overlap * 0.51);

          // Relative velocity along normal
          const kx = b.vx - b2.vx;
          const ky = b.vy - b2.vy;
          const p = nx * kx + ny * ky;

          // Only swap momentum if balls are moving toward each other
          if (p > 0) {
            b.vx -= p * nx;
            b.vy -= p * ny;
            b2.vx += p * nx;
            b2.vy += p * ny;

            addCollisionSpark((b.x + b2.x) * 0.5, (b.y + b2.y) * 0.5, 'rgba(99, 102, 241, 0.85)');
            playCollisionTap(1.0);
          }
        }
      }
    }

    drawCanvas();

    if (phaseRef.current === 'moving') {
      animFrameIdRef.current = requestAnimationFrame(runPhysicsLoop);
    }
  }, [drawCanvas, addCollisionSpark]);

  // Transition helper from Moving to Selecting phase
  const transitionToSelecting = useCallback(() => {
    stopAnimation();
    setPhase('selecting');
    phaseRef.current = 'selecting';
    levelStartTimeRef.current = performance.now();
    drawCanvas();
    playBallsHaltCue();
  }, [stopAnimation, drawCanvas]);

  // Transition helper from Highlight to Moving phase
  const transitionToMoving = useCallback((durationMs: number) => {
    setPhase('moving');
    phaseRef.current = 'moving';
    phaseStartTimeRef.current = performance.now();
    phaseDurationRef.current = durationMs;
    phaseRemainingTimeRef.current = durationMs;
    playMotionWhoosh();
    runPhysicsLoop();

    timeoutIdRef.current = setTimeout(() => {
      transitionToSelecting();
    }, durationMs);
  }, [runPhysicsLoop, transitionToSelecting]);

  // Generate safe non-overlapping positions for balls in virtual coordinate space
  const generateInitialBalls = useCallback((config: ReturnType<typeof getTrackingLevelConfig>): TrackingBall[] => {
    const width = VIRTUAL_WIDTH;
    const height = VIRTUAL_HEIGHT;
    const radius = BALL_RADIUS;
    const newBalls: TrackingBall[] = [];

    // Choose target indices at random
    const targetIndices = new Set<number>();
    while (targetIndices.size < config.targetCount) {
      const randIdx = Math.floor(Math.random() * config.totalBalls);
      targetIndices.add(randIdx);
    }

    const padding = radius + 20;
    const maxAttempts = 350;

    for (let i = 0; i < config.totalBalls; i++) {
      let placed = false;
      let attempts = 0;
      let x = padding + Math.random() * (width - padding * 2);
      let y = padding + Math.random() * (height - padding * 2);

      while (!placed && attempts < maxAttempts) {
        attempts++;
        x = padding + Math.random() * (width - padding * 2);
        y = padding + Math.random() * (height - padding * 2);

        let collision = false;
        for (const existing of newBalls) {
          const dx = existing.x - x;
          const dy = existing.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius * 2.3) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          placed = true;
        }
      }

      // Random movement velocity vector with tuned speed multiplier for 600x750 vertical space
      const angle = Math.random() * Math.PI * 2;
      const speedMultiplier = 1.32;
      const vx = Math.cos(angle) * (config.speed * speedMultiplier);
      const vy = Math.sin(angle) * (config.speed * speedMultiplier);

      newBalls.push({
        id: i,
        x,
        y,
        vx,
        vy,
        radius,
        isTarget: targetIndices.has(i),
        isSelected: false,
      });
    }

    return newBalls;
  }, []);

  // Start round for a specific level
  const startLevelRound = useCallback((level: number) => {
    stopAnimation();
    updateCanvasDimensions();
    collisionSparksRef.current = [];

    const config = getTrackingLevelConfig(level);
    const newBalls = generateInitialBalls(config);

    ballsRef.current = newBalls;
    setBalls(newBalls);
    setSelectedCount(0);
    setPhase('highlight');
    phaseRef.current = 'highlight';

    phaseStartTimeRef.current = performance.now();
    phaseDurationRef.current = config.highlightMs;
    phaseRemainingTimeRef.current = config.highlightMs;

    drawCanvas();
    playTargetHighlightCue();

    // Highlight duration timer -> transition to moving phase
    timeoutIdRef.current = setTimeout(() => {
      transitionToMoving(config.durationMs);
    }, config.highlightMs);
  }, [stopAnimation, updateCanvasDimensions, generateInitialBalls, drawCanvas, transitionToMoving]);

  // Start new endless run
  const handleStartGame = () => {
    playButtonPress();
    setCurrentLevel(1);
    setTotalAccumulatedTimeMs(0);
    setIsNewRecordEarned(false);
    setEvaluation(null);
    startLevelRound(1);
  };

  // Restart to preparation
  const handleRestartToPreparation = () => {
    stopAnimation();
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    setIsCountdownOpen(false);
    setCurrentLevel(1);
    setTotalAccumulatedTimeMs(0);
    setIsNewRecordEarned(false);
    setEvaluation(null);
    setBalls([]);
    setSelectedCount(0);
    setPhase('idle');
    phaseRef.current = 'idle';
  };

  const handleExitDirectly = () => {
    stopAnimation();
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    setIsCountdownOpen(false);
    setPhase('idle');
    phaseRef.current = 'idle';
    onBackToMenu();
  };

  const handleCountdownComplete = () => {
    setIsCountdownOpen(false);
    handleStartGame();
  };

  // Canvas click handler during selecting phase with virtual coordinate mapping
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'selecting') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Precise conversion from DOM client pixels to 600x750 virtual coordinate space
    const clickX = ((e.clientX - rect.left) / rect.width) * VIRTUAL_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * VIRTUAL_HEIGHT;

    const currentBalls = [...ballsRef.current];
    const targetConfig = getTrackingLevelConfig(currentLevel);

    // Find clicked ball with generous touch threshold buffer
    let ballHitIndex = -1;
    let closestDist = Infinity;
    const hitThreshold = Math.max(34, BALL_RADIUS + 14);

    for (let i = 0; i < currentBalls.length; i++) {
      const b = currentBalls[i];
      const dx = clickX - b.x;
      const dy = clickY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= hitThreshold && dist < closestDist) {
        closestDist = dist;
        ballHitIndex = i;
      }
    }

    if (ballHitIndex === -1) return;

    const hitBall = currentBalls[ballHitIndex];

    // Toggle selection
    if (hitBall.isSelected) {
      hitBall.isSelected = false;
      playDeselectTap();
    } else {
      // Check current selected count
      const currentlySelected = currentBalls.filter((b) => b.isSelected).length;
      if (currentlySelected < targetConfig.targetCount) {
        hitBall.isSelected = true;
        if (currentlySelected + 1 === targetConfig.targetCount) {
          playQuotaLockCue();
        } else {
          playSelectionTap();
        }
      } else {
        return; // Quota already reached
      }
    }

    ballsRef.current = currentBalls;
    setBalls([...currentBalls]);

    const newSelectedCount = currentBalls.filter((b) => b.isSelected).length;
    setSelectedCount(newSelectedCount);
    drawCanvas();

    // Trigger instant evaluation when quota is met
    if (newSelectedCount === targetConfig.targetCount) {
      evaluateRoundAnswers(currentBalls);
    }
  };

  // Evaluate user's answers upon completing selection
  const evaluateRoundAnswers = (evaluatedBalls: TrackingBall[]) => {
    const elapsedResponseTime = Math.round(performance.now() - levelStartTimeRef.current);
    const targetConfig = getTrackingLevelConfig(currentLevel);

    // Check if every selected ball is indeed a target
    const isSuccess = evaluatedBalls.every((b) => (b.isSelected ? b.isTarget : true));

    if (isSuccess) {
      // Level Cleared
      playLevelClearFanfare(currentLevel);
      setPhase('evaluating');
      phaseRef.current = 'evaluating';
      drawCanvas();

      const newTotalTime = totalAccumulatedTimeMs + elapsedResponseTime;
      setTotalAccumulatedTimeMs(newTotalTime);

      // Transition smoothly to next level after 850ms
      timeoutIdRef.current = setTimeout(() => {
        const nextLevel = currentLevel + 1;
        setCurrentLevel(nextLevel);
        startLevelRound(nextLevel);
      }, 850);
    } else {
      // Sudden Death: Game Over
      stopAnimation();
      playSuddenDeathImpact();
      setPhase('gameover');
      phaseRef.current = 'gameover';
      drawCanvas();

      // Highest completed level is currentLevel - 1
      const completedLevels = currentLevel - 1;
      const finalEval = getTrackingEvaluation(completedLevels);
      setEvaluation(finalEval);

      // Evaluate and save best record
      const { isNewBest } = saveBestRecord('tracking', completedLevels);
      setIsNewRecordEarned(isNewBest);

      if (isNewBest && completedLevels > 0) {
        setTimeout(() => {
          playNewRecordCelebration();
        }, 320);
      }

      // Save to session history
      addHistoryItem({
        mode: 'tracking',
        primaryMetric: completedLevels,
        unit: 'Level',
        ratingLabel: finalEval.tier,
        subMetric: `Waktu respon: ${(totalAccumulatedTimeMs / 1000).toFixed(1)}s • Gagal di Lvl ${currentLevel}`,
      });

      onRecordUpdated();
    }
  };

  // Redraw when phase or balls change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, phase, balls]);

  const completedLevelScore = Math.max(0, currentLevel - 1);

  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] z-30 flex flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      {/* Universal Top HUD - hidden when gameover */}
      {phase !== 'gameover' && (
        <InGameHUD
          title="Pelacakan Objek"
          modeIcon={<ScanEye className="w-5 h-5 text-violet-600" />}
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

      {/* Main Layout */}
      {phase === 'gameover' ? (
        (() => {
          const tierEval = evaluateScoreTier('tracking', completedLevelScore);
          const isNewRec = isNewRecordEarned || (bestRecord !== null && completedLevelScore > bestRecord);
          return (
            <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative overflow-y-auto">
              <GameResultView
                modeTitle="Pelacakan Objek"
                subModeLabel="Multiple Object Tracking (Endless Sudden Death)"
                primaryScore={completedLevelScore}
                scoreUnit="Level"
                isNewRecord={isNewRec}
                tierRank={tierEval.rank}
                tierName={tierEval.tierName}
                tierCaption={tierEval.badgeLabel || 'Standar Pelacakan Objek'}
                tierDescription={tierEval.desc}
                stats={[
                  {
                    id: 'level_tuntas',
                    label: 'Level Tertinggi Tuntas',
                    value: `Level ${completedLevelScore}`,
                    highlight: true,
                  },
                  {
                    id: 'response_time',
                    label: 'Total Waktu Respon',
                    value: totalAccumulatedTimeMs > 0 ? `${(totalAccumulatedTimeMs / 1000).toFixed(1)} Detik` : '-',
                  },
                  {
                    id: 'last_targets',
                    label: 'Target Bola Terakhir',
                    value: `${activeConfig.targetCount} Bola Simultan`,
                  },
                ]}
                onBackToMenu={() => {
                  playButtonPress();
                  onBackToMenu();
                }}
                onRetry={handleRestartToPreparation}
              />
            </main>
          );
        })()
      ) : phase === 'idle' ? (
        /* Minimalist & Consistent Idle / Preparation Screen with Persistent Footer */
        <div className="w-full h-full min-h-[100dvh] flex flex-col">
          <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 text-center max-w-md mx-auto overflow-y-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-violet-50 border border-violet-200/80 flex items-center justify-center mb-4 text-violet-600 shadow-xs">
              <ScanEye className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
              Pelacakan Objek Visual
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              Pantau bola target yang disorot saat bergerak memantul, lalu pilih kembali semua target saat berhenti. Format <strong className="text-violet-700 font-bold">Endless Sudden Death</strong> menguji konsentrasi tanpa henti.
            </p>

            <div className="w-full flex items-center justify-center gap-2 mb-6 text-xs text-slate-500 font-medium">
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                Level Awal: <strong>1</strong>
              </span>
              <span className="px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700">
                Target Awal: <strong>2 Bola</strong>
              </span>
            </div>

            <AppButton
              id="start-tracking-button"
              label="Mulai Tes"
              icon={<Play className="w-4 h-4 fill-current" />}
              iconPosition="leading"
              variant="primary"
              onClick={() => setIsCountdownOpen(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 font-black px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-900/20 text-xs sm:text-sm w-full"
            />
          </main>

          {/* Bottom Status Panel - Standardized with other modes */}
          <ModePreparationFooter
            mode="tracking"
            bestRecord={bestRecord}
            unit="Level"
            onOpenStandards={() => {
              setInfoTab('standards');
              setIsInfoOpen(true);
            }}
            onOpenRecord={() => setIsRecordOpen(true)}
          />
        </div>
      ) : (
        /* Active Game & Evaluation Container */
        <main className="w-full h-full min-h-[100dvh] flex flex-col items-center justify-between max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-20 overflow-hidden">
          {/* Top Status Bar: Level, Target Counter, and Best Record */}
          <div className="w-full flex items-center justify-between gap-3 py-2.5 border-b border-slate-200/80 text-xs shrink-0 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Level:</span>
              <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200/80">
                {currentLevel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Target:</span>
              <span className="font-mono font-black text-sm text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/80">
                {phase === 'selecting'
                  ? `${selectedCount} / ${activeConfig.targetCount}`
                  : `${activeConfig.targetCount} Bola`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 font-bold">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden sm:inline text-slate-500 font-medium">Rekor:</span>
              <span className="font-mono font-black text-slate-900">
                {bestRecord !== null ? `Level ${bestRecord}` : 'Belum Ada'}
              </span>
            </div>
          </div>

          {/* Phase Instruction & Status Banner (Outside Canvas, 100% Unobstructed Arena) */}
          <div className="w-full flex items-center justify-center pt-1 pb-1.5 shrink-0 px-3">
            {phase === 'highlight' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50/90 border border-amber-200/90 text-amber-950 shadow-xs text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                <Target className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                <span>Fokus & amati <strong className="font-black text-amber-800">{activeConfig.targetCount}</strong> bola target berkedip</span>
              </div>
            )}

            {phase === 'moving' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white shadow-xs text-xs font-semibold animate-in fade-in duration-150">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pantau pergerakan bola target secara cermat</span>
              </div>
            )}

            {phase === 'selecting' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/90 text-indigo-950 shadow-xs text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Pilih <strong className="font-black text-indigo-700">{activeConfig.targetCount}</strong> bola target yang dipantau</span>
                <span className="ml-0.5 text-[11px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                  {selectedCount}/{activeConfig.targetCount}
                </span>
              </div>
            )}

            {phase === 'evaluating' && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 shadow-xs text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Level {currentLevel} Berhasil! Bersiap level berikutnya...</span>
              </div>
            )}
          </div>

          {/* Center: Stage / Canvas Area (Guaranteed 100% visible on one screen without scrolling or zoom) */}
          <div
            ref={arenaWrapperRef}
            className="w-full flex-1 flex items-center justify-center p-1 sm:p-2 min-h-0 min-w-0 relative overflow-hidden"
          >
            {/* Aspect-ratio locked canvas container sized dynamically to fit available screen space */}
            <div
              ref={containerRef}
              style={{
                width: arenaDimensions.width > 0 ? `${arenaDimensions.width}px` : undefined,
                height: arenaDimensions.height > 0 ? `${arenaDimensions.height}px` : undefined,
              }}
              className="relative rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white shadow-md overflow-hidden flex items-center justify-center shrink-0 transition-all duration-75"
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`block ${phase === 'selecting' ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ touchAction: 'none' }}
              />
            </div>
          </div>
        </main>
      )}

      {/* Universal 3-Second Countdown */}
      <UniversalCountdown
        isOpen={isCountdownOpen}
        onComplete={handleCountdownComplete}
        onCancel={() => setIsCountdownOpen(false)}
        title="Pelacakan Objek"
        accentColor="indigo"
      />

      {/* Unified Panduan & Standar Modal */}
      <ModeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        mode="tracking"
        initialTab={infoTab}
      />

      {/* Mode Record & History Modal */}
      <ModeRecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        mode="tracking"
        modeTitle="Pelacakan Objek"
        unit="Level"
        onRecordCleared={onRecordUpdated}
      />
    </div>
  );
};

