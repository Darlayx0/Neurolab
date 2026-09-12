import {
  FlankerDirection,
  FlankerRuleType,
  FlankerConflictType,
  FlankerTrialConfig,
  FlankerTrialResult,
  FlankerSessionSummary,
} from '../types';

export const FLANKER_TOTAL_TRIALS = 30;
export const FLANKER_INITIAL_TIMEOUT_MS = 1500;
export const FLANKER_FINAL_TIMEOUT_MS = 550;
export const FLANKER_RESPONSE_TIMEOUT_MS = 900; // Default baseline for reference

/**
 * Menghitung batas waktu respons dinamis untuk setiap nomor trial (1-30).
 * Dimulai dari 1.500 ms di awal sesi dan menyusut secara bertahap hingga 550 ms pada trial 30.
 */
export function getTrialTimeoutMs(trialIndex: number): number {
  const step = (FLANKER_INITIAL_TIMEOUT_MS - FLANKER_FINAL_TIMEOUT_MS) / (FLANKER_TOTAL_TRIALS - 1);
  const timeout = FLANKER_INITIAL_TIMEOUT_MS - (trialIndex - 1) * step;
  return Math.round(Math.max(FLANKER_FINAL_TIMEOUT_MS, Math.min(FLANKER_INITIAL_TIMEOUT_MS, timeout)));
}

export const ALL_FLANKER_DIRECTIONS: FlankerDirection[] = ['left', 'right', 'up', 'down'];

/**
 * Mendapatkan arah polar 180° berlawanan
 */
export function getOppositeDirection(dir: FlankerDirection): FlankerDirection {
  switch (dir) {
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    case 'up':
      return 'down';
    case 'down':
      return 'up';
  }
}

/**
 * Memeriksa apakah dua arah berada pada sumbu yang sama (keduanya horizontal atau keduanya vertikal)
 */
export function isSameAxis(a: FlankerDirection, b: FlankerDirection): boolean {
  const isAHorizontal = a === 'left' || a === 'right';
  const isBHorizontal = b === 'left' || b === 'right';
  return isAHorizontal === isBHorizontal;
}

/**
 * Mendapatkan tipe konflik stimulus
 */
export function determineConflictType(
  target: FlankerDirection,
  flanker: FlankerDirection
): FlankerConflictType {
  if (target === flanker) {
    return 'congruent';
  }
  if (isSameAxis(target, flanker)) {
    return 'collinear_incongruent';
  }
  return 'orthogonal_incongruent';
}

interface RawTrialPlan {
  targetDirection: FlankerDirection;
  flankerDirection: FlankerDirection;
  rule: FlankerRuleType;
  conflictType: FlankerConflictType;
}

/**
 * Menghasilkan urutan 30 stimulus seimbang dengan distribusi ilmiah
 * mencakup 4 arah spasial (Kiri, Kanan, Atas, Bawah) dan konflik ortogonal.
 */
export function generateFlankerTrials(): FlankerTrialConfig[] {
  const plans: RawTrialPlan[] = [];

  const directions: FlankerDirection[] = ['left', 'right', 'up', 'down'];

  // Helper untuk membuat trial terstruktur
  const addTrial = (
    target: FlankerDirection,
    conflict: FlankerConflictType,
    rule: FlankerRuleType
  ) => {
    let flanker: FlankerDirection = target;
    if (conflict === 'collinear_incongruent') {
      flanker = getOppositeDirection(target);
    } else if (conflict === 'orthogonal_incongruent') {
      // Ambil arah tegak lurus
      const isTargetHoriz = target === 'left' || target === 'right';
      const orthogonalPool: FlankerDirection[] = isTargetHoriz ? ['up', 'down'] : ['left', 'right'];
      flanker = orthogonalPool[Math.floor(Math.random() * orthogonalPool.length)];
    }
    plans.push({
      targetDirection: target,
      flankerDirection: flanker,
      rule,
      conflictType: conflict,
    });
  };

  // 1. Direct Rule (15 trials):
  // 5 Congruent, 5 Collinear Incongruent, 5 Orthogonal Incongruent
  directions.forEach((d) => addTrial(d, 'congruent', 'direct'));
  addTrial('left', 'congruent', 'direct'); // 5th

  directions.forEach((d) => addTrial(d, 'collinear_incongruent', 'direct'));
  addTrial('up', 'collinear_incongruent', 'direct'); // 5th

  directions.forEach((d) => addTrial(d, 'orthogonal_incongruent', 'direct'));
  addTrial('down', 'orthogonal_incongruent', 'direct'); // 5th

  // 2. Inverse Rule (15 trials):
  // 5 Congruent, 5 Collinear Incongruent, 5 Orthogonal Incongruent
  directions.forEach((d) => addTrial(d, 'congruent', 'inverse'));
  addTrial('right', 'congruent', 'inverse'); // 5th

  directions.forEach((d) => addTrial(d, 'collinear_incongruent', 'inverse'));
  addTrial('down', 'collinear_incongruent', 'inverse'); // 5th

  directions.forEach((d) => addTrial(d, 'orthogonal_incongruent', 'inverse'));
  addTrial('right', 'orthogonal_incongruent', 'inverse'); // 5th

  // Fisher-Yates shuffle untuk pengacakan sempurna tanpa bias repetisi berlebih
  const shuffled = [...plans];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((plan, idx) => {
    const isCongruent = plan.conflictType === 'congruent';
    let expectedResponse: FlankerDirection = plan.targetDirection;

    if (plan.rule === 'inverse') {
      expectedResponse = getOppositeDirection(plan.targetDirection);
    }

    // Variasi jeda ISI (450ms - 700ms) untuk mencegah ritme mekanis/antisipatif
    const isiDurationMs = Math.floor(Math.random() * (700 - 450 + 1)) + 450;
    const timeoutMs = getTrialTimeoutMs(idx + 1);

    return {
      trialIndex: idx + 1,
      targetDirection: plan.targetDirection,
      flankerDirection: plan.flankerDirection,
      rule: plan.rule,
      isCongruent,
      conflictType: plan.conflictType,
      expectedResponse,
      isiDurationMs,
      timeoutMs,
    };
  });
}

/**
 * Komputasi analitik neurokognitif menyeluruh untuk sesi Flanker 4-Arah
 */
export function calculateFlankerSummary(results: FlankerTrialResult[]): FlankerSessionSummary {
  const totalTrials = results.length;
  const completedTrials = results.filter((r) => r.userResponse !== null).length;
  const correctTrials = results.filter((r) => r.isCorrect);

  const accuracyRate = totalTrials > 0 ? Math.round((correctTrials.length / totalTrials) * 100) : 0;

  // Hanya hitung waktu respons dari percobaan yang dijawab benar (standar psikometri)
  const validReactionTimes = correctTrials.map((r) => r.reactionTimeMs);
  const meanReactionTimeMs =
    validReactionTimes.length > 0
      ? Math.round(validReactionTimes.reduce((a, b) => a + b, 0) / validReactionTimes.length)
      : 0;

  // 1. Kondisi Kongruen vs Inkongruen
  const congruentRts = correctTrials.filter((r) => r.isCongruent).map((r) => r.reactionTimeMs);
  const incongruentRts = correctTrials.filter((r) => !r.isCongruent).map((r) => r.reactionTimeMs);

  const congruentMeanRtMs =
    congruentRts.length > 0
      ? Math.round(congruentRts.reduce((a, b) => a + b, 0) / congruentRts.length)
      : meanReactionTimeMs;

  const incongruentMeanRtMs =
    incongruentRts.length > 0
      ? Math.round(incongruentRts.reduce((a, b) => a + b, 0) / incongruentRts.length)
      : meanReactionTimeMs;

  // Biaya Interferensi Flanker (Incongruent - Congruent)
  const flankerInterferenceCostMs = Math.max(0, incongruentMeanRtMs - congruentMeanRtMs);

  // 2. Konflik Ortogonal vs Kolinier
  const orthogonalRts = correctTrials
    .filter((r) => r.conflictType === 'orthogonal_incongruent')
    .map((r) => r.reactionTimeMs);
  const collinearRts = correctTrials
    .filter((r) => r.conflictType === 'collinear_incongruent')
    .map((r) => r.reactionTimeMs);

  const orthogonalMeanRtMs =
    orthogonalRts.length > 0
      ? Math.round(orthogonalRts.reduce((a, b) => a + b, 0) / orthogonalRts.length)
      : incongruentMeanRtMs;

  const collinearMeanRtMs =
    collinearRts.length > 0
      ? Math.round(collinearRts.reduce((a, b) => a + b, 0) / collinearRts.length)
      : incongruentMeanRtMs;

  const orthogonalDistractionCostMs = Math.max(0, orthogonalMeanRtMs - collinearMeanRtMs);

  // 3. Kondisi Direct vs Inverse
  const directRts = correctTrials.filter((r) => r.rule === 'direct').map((r) => r.reactionTimeMs);
  const inverseRts = correctTrials.filter((r) => r.rule === 'inverse').map((r) => r.reactionTimeMs);

  const directMeanRtMs =
    directRts.length > 0
      ? Math.round(directRts.reduce((a, b) => a + b, 0) / directRts.length)
      : meanReactionTimeMs;

  const inverseMeanRtMs =
    inverseRts.length > 0
      ? Math.round(inverseRts.reduce((a, b) => a + b, 0) / inverseRts.length)
      : meanReactionTimeMs;

  // Biaya Inversi Aturan (Inverse - Direct)
  const ruleInversionCostMs = Math.max(0, inverseMeanRtMs - directMeanRtMs);

  // Error komisi (salah tekan arah) vs omisi (kehabisan batas waktu)
  const omissionErrors = results.filter((r) => r.userResponse === null).length;
  const commissionErrors = results.filter((r) => r.userResponse !== null && !r.isCorrect).length;
  const totalErrors = omissionErrors + commissionErrors;

  // =========================================================================
  // SISTEM SKOR PROFESIONAL (0 - 1.000 Poin)
  // =========================================================================
  // 1. Akurasi Eksekutif (Maks 500 Poin)
  const accuracyPoints = Math.round((correctTrials.length / (totalTrials || 1)) * 500);

  // 2. Bonus Kecepatan Reaksi (Maks 350 Poin)
  // Skala: Mean RT <= 350ms mendapat bonus 350 poin penuh; Mean RT >= 1100ms mendapat 0 poin
  const speedBonus =
    meanReactionTimeMs > 0
      ? Math.round(
          Math.max(0, Math.min(350, ((1100 - meanReactionTimeMs) / (1100 - 350)) * 350))
        )
      : 0;

  // 3. Runtutan Benar / Best Streak (Maks 150 Poin)
  let currentStreak = 0;
  let bestStreak = 0;
  for (const r of results) {
    if (r.isCorrect) {
      currentStreak++;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }
  const streakBonus = Math.round((bestStreak / (totalTrials || 1)) * 150);

  // 4. Penalti Kesalahan & Timeout (-15 Poin per kesalahan)
  const penaltyPoints = totalErrors * 15;

  // Total Skor Terkunci (0 - 1.000 Poin)
  const rawTotalScore = accuracyPoints + speedBonus + streakBonus - penaltyPoints;
  const totalScore = Math.max(0, Math.min(1000, rawTotalScore));

  const fastestRtMs = validReactionTimes.length > 0 ? Math.min(...validReactionTimes) : 0;

  return {
    sessionId: `flanker_${Date.now()}`,
    totalTrials,
    completedTrials,
    accuracyRate,
    meanReactionTimeMs,
    congruentMeanRtMs,
    incongruentMeanRtMs,
    flankerInterferenceCostMs,
    orthogonalDistractionCostMs,
    ruleInversionCostMs,
    inhibitionResilienceIndex: totalScore, // Alias kompatibel skala 1000
    totalScore,
    accuracyPoints,
    speedBonus,
    streakBonus,
    penaltyPoints,
    bestStreak,
    fastestRtMs,
    commissionErrors,
    omissionErrors,
    recordedAt: new Date().toISOString(),
  };
}
