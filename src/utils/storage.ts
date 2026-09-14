import { BestRecords, HistoryItem, ReflexMode, MatrixGridSize, SubModeDefinition, TrackingLevelConfig, ChromaticLevelConfig, HSLColor, EvaluationResult } from '../types';
import { evaluateScoreTier } from './tierSystem';

const STORAGE_KEYS = {
  HISTORY: 'reflex_trainer_history_v2',
  RECORDS: 'reflex_trainer_records_v2',
};

export const MODE_SUBMODES_MAP: Partial<Record<ReflexMode, SubModeDefinition[]>> = {
  matrix: [
    { id: 'grid_4', label: 'Grid 4x4 (16 Angka)', shortLabel: 'Grid 4x4', description: 'Kecepatan pemindaian 16 angka' },
    { id: 'grid_5', label: 'Grid 5x5 (25 Angka)', shortLabel: 'Grid 5x5', description: 'Standar Schulte Table 25 angka' },
    { id: 'grid_6', label: 'Grid 6x6 (36 Angka)', shortLabel: 'Grid 6x6', description: 'Tantangan visual 36 angka' },
  ],
  nback: [
    { id: '1_back', label: 'Level 1-Back (Dasar)', shortLabel: '1-Back', description: 'Memori kerja 1 langkah lalu' },
    { id: '2_back', label: 'Level 2-Back (Standar)', shortLabel: '2-Back', description: 'Memori kerja 2 langkah lalu' },
    { id: '3_back', label: 'Level 3-Back (Pakar)', shortLabel: '3-Back', description: 'Memori kerja 3 langkah lalu' },
  ],
  audio: [
    { id: 'freq_440', label: 'Nada Rendah (440 Hz)', shortLabel: '440 Hz', description: 'Stimulus audio nada rendah' },
    { id: 'freq_880', label: 'Nada Sedang (880 Hz)', shortLabel: '880 Hz', description: 'Stimulus audio nada sedang' },
    { id: 'freq_1760', label: 'Nada Tinggi (1760 Hz)', shortLabel: '1760 Hz', description: 'Stimulus audio nada tinggi' },
  ],
};

export const INITIAL_RECORDS: BestRecords = {
  visual: null,
  audio: null,
  memory: null,
  color_memory: null,
  motor: null,
  concentration: null,
  digit_span: null,
  nback: null,
  matrix: null,
  tracking: null,
  chromatic: null,
  switching: null,
  temporal: null,
  flanker: null,
};

export function getStoredRecords(): BestRecords {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) return { ...INITIAL_RECORDS };
    const parsed = JSON.parse(raw);
    const result: BestRecords = {
      visual: typeof parsed.visual === 'number' ? parsed.visual : null,
      audio: typeof parsed.audio === 'number' ? parsed.audio : null,
      memory: typeof parsed.memory === 'number' ? parsed.memory : null,
      color_memory: typeof parsed.color_memory === 'number' ? parsed.color_memory : null,
      motor: typeof parsed.motor === 'number' ? parsed.motor : null,
      concentration: typeof parsed.concentration === 'number' ? parsed.concentration : null,
      digit_span: typeof parsed.digit_span === 'number' ? parsed.digit_span : null,
      nback: typeof parsed.nback === 'number' ? parsed.nback : null,
      matrix: typeof parsed.matrix === 'number' ? parsed.matrix : null,
      tracking: typeof parsed.tracking === 'number' ? parsed.tracking : null,
      chromatic: typeof parsed.chromatic === 'number' ? parsed.chromatic : null,
      switching: typeof parsed.switching === 'number' ? parsed.switching : null,
      temporal: typeof parsed.temporal === 'number' ? parsed.temporal : null,
      flanker: typeof parsed.flanker === 'number' ? parsed.flanker : null,
    };

    // Include composite keys
    for (const key of Object.keys(parsed)) {
      if (key.includes(':') && typeof parsed[key] === 'number') {
        result[key] = parsed[key];
      }
    }

    // Auto-migration from legacy base records if submode record is missing
    if (result.matrix !== null && result['matrix:grid_5'] === undefined) {
      result['matrix:grid_5'] = result.matrix;
    }
    if (result.nback !== null && result['nback:2_back'] === undefined) {
      result['nback:2_back'] = result.nback;
    }
    if (result.audio !== null && result['audio:freq_880'] === undefined) {
      result['audio:freq_880'] = result.audio;
    }

    return result;
  } catch {
    return { ...INITIAL_RECORDS };
  }
}

export function getBestRecord(mode: ReflexMode, subMode?: string): number | null {
  const records = getStoredRecords();
  if (subMode) {
    const compositeKey = `${mode}:${subMode}`;
    if (typeof records[compositeKey] === 'number') {
      return records[compositeKey] as number;
    }
    return null;
  }
  return records[mode];
}

export function saveBestRecord(
  mode: ReflexMode,
  score: number,
  subMode?: string
): { isNewBest: boolean; bestScore: number } {
  const current = getStoredRecords();
  let isNewBest = false;
  const compositeKey = subMode ? `${mode}:${subMode}` : null;
  
  // Isolated previous score per sub-mode
  const prev = compositeKey
    ? (typeof current[compositeKey] === 'number' ? (current[compositeKey] as number) : null)
    : current[mode];

  const lowerIsBetter = mode === 'visual' || mode === 'audio' || mode === 'concentration' || mode === 'matrix' || mode === 'switching' || mode === 'temporal';

  if (lowerIsBetter) {
    // For reaction time ms and matrix completion time (seconds), lower is better
    if (prev === null || score < prev) {
      isNewBest = true;
    }
  } else {
    // For memory, motor, digit_span, and nback, higher is better
    if (prev === null || score > prev) {
      isNewBest = true;
    }
  }

  if (isNewBest) {
    if (compositeKey) {
      current[compositeKey] = score;
    } else {
      current[mode] = score;
    }

    // Synchronize mode base default record
    const submodes = MODE_SUBMODES_MAP[mode];
    if (submodes && submodes.length > 0) {
      // Keep base record as default submode (e.g. grid_5, 2_back, freq_880)
      const defaultSubMode = submodes[1]?.id || submodes[0].id;
      if (typeof current[`${mode}:${defaultSubMode}`] === 'number') {
        current[mode] = current[`${mode}:${defaultSubMode}`] as number;
      } else if (compositeKey && typeof current[compositeKey] === 'number') {
        current[mode] = current[compositeKey] as number;
      }
    } else {
      current[mode] = score;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(current));
    } catch {
      // Ignore
    }
  }

  const finalScore = compositeKey
    ? (typeof current[compositeKey] === 'number' ? (current[compositeKey] as number) : score)
    : (current[mode] ?? score);

  return {
    isNewBest,
    bestScore: finalScore,
  };
}

export function getStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100).map((item: HistoryItem) => {
      // Auto infer subMode if missing from legacy records
      if (!item.subMode && item.subMetric) {
        if (item.mode === 'matrix') {
          if (item.subMetric.includes('4x4')) {
            item.subMode = 'grid_4';
            item.subModeLabel = 'Grid 4x4';
          } else if (item.subMetric.includes('6x6')) {
            item.subMode = 'grid_6';
            item.subModeLabel = 'Grid 6x6';
          } else {
            item.subMode = 'grid_5';
            item.subModeLabel = 'Grid 5x5';
          }
        } else if (item.mode === 'nback') {
          if (item.subMetric.includes('1-Back')) {
            item.subMode = '1_back';
            item.subModeLabel = '1-Back';
          } else if (item.subMetric.includes('3-Back')) {
            item.subMode = '3_back';
            item.subModeLabel = '3-Back';
          } else {
            item.subMode = '2_back';
            item.subModeLabel = '2-Back';
          }
        } else if (item.mode === 'audio') {
          if (item.subMetric.includes('440Hz') || item.subMetric.includes('440 Hz')) {
            item.subMode = 'freq_440';
            item.subModeLabel = '440 Hz';
          } else if (item.subMetric.includes('1760Hz') || item.subMetric.includes('1760 Hz')) {
            item.subMode = 'freq_1760';
            item.subModeLabel = '1760 Hz';
          } else {
            item.subMode = 'freq_880';
            item.subModeLabel = '880 Hz';
          }
        }
      }
      return item;
    });
  } catch {
    return [];
  }
}

export function addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp' | 'dateStr'>): HistoryItem {
  const history = getStoredHistory();
  const now = Date.now();
  const date = new Date(now);
  const dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const newItem: HistoryItem = {
    ...item,
    id: 'rec_' + now + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: now,
    dateStr,
  };

  const updated = [newItem, ...history].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  } catch {
    // Ignore
  }

  return newItem;
}

export function clearModeHistory(mode: ReflexMode, subMode?: string): void {
  try {
    const history = getStoredHistory();
    let updatedHistory: HistoryItem[];

    if (subMode && subMode !== 'all') {
      updatedHistory = history.filter((item) => !(item.mode === mode && item.subMode === subMode));
    } else {
      updatedHistory = history.filter((item) => item.mode !== mode);
    }
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));

    const records = getStoredRecords();
    if (subMode && subMode !== 'all') {
      const compositeKey = `${mode}:${subMode}`;
      records[compositeKey] = null;

      // Recalculate mode base record from remaining submodes if applicable
      const submodes = MODE_SUBMODES_MAP[mode];
      if (submodes && submodes.length > 0) {
        const remainingScores: number[] = [];
        for (const sm of submodes) {
          const val = records[`${mode}:${sm.id}`];
          if (typeof val === 'number') {
            remainingScores.push(val);
          }
        }
        if (remainingScores.length > 0) {
          const lowerIsBetter = mode === 'visual' || mode === 'audio' || mode === 'concentration' || mode === 'matrix' || mode === 'switching' || mode === 'temporal';
          records[mode] = lowerIsBetter ? Math.min(...remainingScores) : Math.max(...remainingScores);
        } else {
          records[mode] = null;
        }
      } else {
        records[mode] = null;
      }
    } else {
      records[mode] = null;
      const submodes = MODE_SUBMODES_MAP[mode];
      if (submodes) {
        for (const sm of submodes) {
          records[`${mode}:${sm.id}`] = null;
        }
      }
    }
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch {
    // Ignore
  }
}

export function clearAllReflexData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
  } catch {
    // Ignore
  }
}

export type { EvaluationResult } from '../types';

export function getReactionEvaluation(ms: number): EvaluationResult {
  const t = evaluateScoreTier('visual', ms);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getAudioEvaluation(ms: number, subMode?: string): EvaluationResult {
  const t = evaluateScoreTier('audio', ms, subMode);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getConcentrationEvaluation(ms: number): EvaluationResult {
  const t = evaluateScoreTier('concentration', ms);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getMotorEvaluation(netHits: number): EvaluationResult {
  const t = evaluateScoreTier('motor', netHits);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getMemoryEvaluation(level: number): EvaluationResult {
  const t = evaluateScoreTier('memory', level);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getDigitSpanEvaluation(span: number): EvaluationResult {
  const t = evaluateScoreTier('digit_span', span);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getNBackEvaluation(accuracy: number, nLevel: number = 2): EvaluationResult {
  const subModeKey = `${nLevel}_back`;
  const t = evaluateScoreTier('nback', accuracy, subModeKey);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getMatrixEvaluation(seconds: number, gridSize: MatrixGridSize = 5): EvaluationResult {
  const subModeKey = `grid_${gridSize}`;
  const t = evaluateScoreTier('matrix', seconds, subModeKey);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}


export function getTrackingLevelConfig(level: number): TrackingLevelConfig {
  // Safe boundaries: Start at 4 balls (Lvl 1), cap at 12 balls to maintain spacious arena
  const totalBalls = Math.min(12, 3 + level);
  
  // Smooth target progression: Lvl 1-2 = 2 target, Lvl 3-4 = 3 target, Lvl 5-6 = 4 target, Lvl 7-8 = 5 target, Lvl 9+ = 6 target
  const targetCount = Math.min(6, Math.max(2, Math.floor((totalBalls) / 2)));
  
  // Speed gradually scales from 1.8 to 4.5 px/frame (60fps baseline)
  const speed = Math.min(4.5, 1.8 + (level - 1) * 0.28);
  
  // Movement duration: scales smoothly from 4.0s (4000ms) up to 7.0s (7000ms)
  const durationMs = Math.min(7000, 4000 + (level - 1) * 450);

  return {
    level,
    totalBalls,
    targetCount,
    speed,
    durationMs,
    highlightMs: 1800,
  };
}

export function getTrackingEvaluation(completedLevels: number): EvaluationResult {
  const t = evaluateScoreTier('tracking', completedLevels);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getChromaticDeltaL(level: number): number {
  const raw = Math.max(1.0, 20 * Math.pow(0.88, Math.max(1, level) - 1));
  return Math.round(raw * 10) / 10;
}

export function generateChromaticLevel(level: number): ChromaticLevelConfig {
  const deltaL = getChromaticDeltaL(level);
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(55 + Math.random() * 25); // 55% - 80%
  const l = Math.floor(40 + Math.random() * 22); // 40% - 62%

  const isLighter = Math.random() > 0.5;
  let targetL = isLighter ? l + deltaL : l - deltaL;
  if (targetL > 82) targetL = l - deltaL;
  if (targetL < 22) targetL = l + deltaL;

  const targetIndex = Math.floor(Math.random() * 25);

  return {
    level,
    baseColor: { h, s, l },
    anomalyColor: { h, s, l: Math.round(targetL * 10) / 10 },
    targetIndex,
    deltaL,
  };
}

export function getChromaticEvaluation(completedLevel: number, accuracy: number): EvaluationResult {
  const t = evaluateScoreTier('chromatic', completedLevel);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}

export function getColorMemoryEvaluation(completedLevel: number): EvaluationResult {
  const t = evaluateScoreTier('color_memory', completedLevel);
  return {
    rank: t.rank || 6,
    tier: t.badgeLabel,
    color: t.colorClass,
    badgeBg: `${t.badgeBg} ${t.badgeBorder} ${t.textColor}`,
    desc: t.desc,
  };
}


