import type { ReactNode, MouseEvent } from 'react';

export type ReflexMode = 'visual' | 'audio' | 'memory' | 'color_memory' | 'motor' | 'concentration' | 'digit_span' | 'nback' | 'matrix' | 'tracking' | 'chromatic' | 'switching' | 'temporal' | 'flanker';

export type AppView = 'menu' | ReflexMode;

export type MatrixGridSize = 4 | 5 | 6;

export type GeneralTestState = 'idle' | 'waiting' | 'ready' | 'penalty' | 'completed';

export type AudioFrequency = 440 | 880 | 1760;

export type MatrixSubMode = 'grid_4' | 'grid_5' | 'grid_6';
export type NBackSubMode = '1_back' | '2_back' | '3_back';
export type AudioSubMode = 'freq_440' | 'freq_880' | 'freq_1760';

export type SubModeId = MatrixSubMode | NBackSubMode | AudioSubMode | 'default';

export type ChromaticPhase = 'idle' | 'countdown' | 'playing' | 'summary';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface ChromaticLevelConfig {
  level: number;
  baseColor: HSLColor;
  anomalyColor: HSLColor;
  targetIndex: number;
  deltaL: number;
}

export interface ChromaColorDefinition {
  id: string;
  name: string;
  hex: string;
  twBg: string;
  twBorder: string;
  twText: string;
  twRing: string;
  twGlow: string;
}

export interface ChromaTile {
  id: number;
  colorId: string;
  color: ChromaColorDefinition;
  isRevealed: boolean;
  isMatched: boolean;
  isWrong: boolean;
}

export type ColorMemoryPhase = 'idle' | 'countdown' | 'memorize' | 'recall' | 'level_cleared' | 'game_over';

export interface ChromaLevelConfig {
  level: number;
  gridSize: number; // 3 (3x3), 4 (4x4), 5 (5x5), 6 (6x6)
  totalTiles: number;
  colorCount: number;
  memorizeDurationMs: number;
  activeColors: ChromaColorDefinition[];
  targetColor: ChromaColorDefinition;
  targetCount: number;
}

export interface TrackingBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTarget: boolean;
  isSelected: boolean;
}

export type TrackingPhase =
  | 'idle'
  | 'highlight'
  | 'moving'
  | 'selecting'
  | 'evaluating'
  | 'gameover';

export interface TrackingLevelConfig {
  level: number;
  totalBalls: number;
  targetCount: number;
  speed: number;
  durationMs: number;
  highlightMs: number;
}

export interface SubModeDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  mode: ReflexMode;
  subMode?: string;
  subModeLabel?: string;
  timestamp: number;
  primaryMetric: number; // e.g. ms, level, hits, points, digits
  unit: string;
  ratingLabel: string;
  subMetric?: string;
  dateStr: string;
}

export interface MemoryCard {
  id: number;
  value: number;
  isRevealed: boolean;
  isMatched: boolean;
}

export interface BestRecords {
  visual: number | null; // min ms
  audio: number | null; // min ms
  memory: number | null; // max level
  color_memory: number | null; // max level
  motor: number | null; // max hits in 60s
  concentration: number | null; // max score ms
  digit_span: number | null; // max digits span
  nback: number | null; // max accuracy %
  matrix: number | null; // min seconds
  tracking: number | null; // max completed level
  chromatic: number | null; // max completed level
  switching: number | null; // min effective switch cost ms
  temporal: number | null; // min mean absolute deviation ms
  flanker: number | null; // max resilience index (0 - 100 points)
  [subModeKey: string]: number | null | undefined;
}

export type FlankerDirection = 'left' | 'right' | 'up' | 'down';
export type FlankerRuleType = 'direct' | 'inverse';
export type FlankerConflictType = 'congruent' | 'collinear_incongruent' | 'orthogonal_incongruent';

export interface FlankerTrialConfig {
  trialIndex: number;
  targetDirection: FlankerDirection;
  flankerDirection: FlankerDirection;
  rule: FlankerRuleType; // 'direct' = searah target, 'inverse' = lawan arah target
  isCongruent: boolean;
  conflictType: FlankerConflictType;
  expectedResponse: FlankerDirection;
  isiDurationMs: number;
  timeoutMs: number;
}

export interface FlankerTrialResult {
  trialIndex: number;
  targetDirection: FlankerDirection;
  flankerDirection: FlankerDirection;
  rule: FlankerRuleType;
  isCongruent: boolean;
  conflictType: FlankerConflictType;
  userResponse: FlankerDirection | null; // null jika timeout/omission
  isCorrect: boolean;
  reactionTimeMs: number;
  timestamp: number;
}

export interface FlankerSessionSummary {
  sessionId: string;
  totalTrials: number;
  completedTrials: number;
  accuracyRate: number; // 0 - 100%
  meanReactionTimeMs: number;
  congruentMeanRtMs: number;
  incongruentMeanRtMs: number;
  flankerInterferenceCostMs: number;
  orthogonalDistractionCostMs: number;
  ruleInversionCostMs: number;
  inhibitionResilienceIndex: number; // 0 - 1000 Poin (kompatibilitas universal)
  totalScore: number; // 0 - 1000 Poin
  accuracyPoints: number; // 0 - 500 Poin
  speedBonus: number; // 0 - 350 Poin
  streakBonus: number; // 0 - 150 Poin
  penaltyPoints: number; // Akumulasi penalti kesalahan
  bestStreak: number; // Runtutan benar berurutan tertinggi
  fastestRtMs: number; // Waktu respons tercepat
  commissionErrors: number;
  omissionErrors: number;
  recordedAt: string;
}

export interface TemporalRoundResult {
  roundNumber: number;
  targetDurationMs: number;
  actualDurationMs: number;
  deviationMs: number;
  signedDeviationMs: number;
}

export interface ButtonProps {
  id?: string;
  label: string;
  icon?: ReactNode;
  iconPosition?: 'leading' | 'trailing' | 'only' | 'none';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  className?: string;
}

export interface ReflexBenchmark {
  tier: string;
  badge: string;
  minMs: number;
  maxMs: number;
  description: string;
}

export type TierRank = 1 | 2 | 3 | 4 | 5 | 6;

export interface EvaluationResult {
  rank: TierRank;
  tier: string;
  color: string;
  badgeBg: string;
  desc: string;
}
