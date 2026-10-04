import { ScaleShape, ScaleShapeId, ScalePair, ScaleQuestionType, ScaleTrialConfig } from '../types';

export const MASTER_SCALE_SHAPES: Omit<ScaleShape, 'weight'>[] = [
  {
    id: 'circle',
    name: 'Lingkaran',
    colorName: 'Merah Terang',
    bgColor: 'bg-rose-500',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-500',
    ringColor: 'ring-rose-400/50',
  },
  {
    id: 'square',
    name: 'Persegi',
    colorName: 'Hijau Zamrud',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-500',
    ringColor: 'ring-emerald-400/50',
  },
  {
    id: 'triangle',
    name: 'Segitiga',
    colorName: 'Kuning Amber',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-500',
    ringColor: 'ring-amber-400/50',
  },
  {
    id: 'diamond',
    name: 'Belah Ketupat',
    colorName: 'Biru Langit',
    bgColor: 'bg-sky-500',
    borderColor: 'border-sky-400',
    textColor: 'text-sky-500',
    ringColor: 'ring-sky-400/50',
  },
  {
    id: 'hexagon',
    name: 'Segienam',
    colorName: 'Ungu Lembayung',
    bgColor: 'bg-violet-500',
    borderColor: 'border-violet-400',
    textColor: 'text-violet-500',
    ringColor: 'ring-violet-400/50',
  },
  {
    id: 'star',
    name: 'Bintang',
    colorName: 'Oranye Neon',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-500',
    ringColor: 'ring-orange-400/50',
  },
  {
    id: 'cylinder',
    name: 'Silinder',
    colorName: 'Merah Muda',
    bgColor: 'bg-pink-500',
    borderColor: 'border-pink-400',
    textColor: 'text-pink-500',
    ringColor: 'ring-pink-400/50',
  },
];

/**
 * Acak urutan array secara in-place menggunakan algoritma Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Hitung batas waktu per ronde berdasarkan level progresif (dalam milidetik)
 */
export function calculateTimeoutForLevel(level: number): number {
  if (level <= 2) return 12000;
  if (level <= 5) return 10000;
  if (level <= 8) return 8500;
  if (level <= 12) return 7000;
  if (level <= 15) return 6000;
  return 5000;
}

/**
 * Generator prosedural murni untuk 1 ronde Neraca Relasi Bobot
 */
export function generateScaleTrial(level: number, trialIndex: number): ScaleTrialConfig {
  // 1. Tentukan jumlah objek berdasarkan level
  let numShapes = 3;
  if (level >= 6 && level <= 11) {
    numShapes = 4;
  } else if (level >= 12) {
    numShapes = Math.random() < 0.65 ? 4 : 5;
  }

  // 2. Pilih N bentuk unik acak dari master shapes
  const selectedBaseShapes = shuffleArray(MASTER_SCALE_SHAPES).slice(0, numShapes);

  // 3. Beri bobot tegas 1 .. N (N = terberat, 1 = teringan) secara acak
  const shuffledWeights = shuffleArray(Array.from({ length: numShapes }, (_, i) => i + 1));
  const shapes: ScaleShape[] = selectedBaseShapes.map((base, idx) => ({
    ...base,
    weight: shuffledWeights[idx],
  }));

  // 4. Urutkan bentuk dari yang terberat ke teringan untuk menyusun rantai transitif
  // Sorted: shapesSorted[0] > shapesSorted[1] > ... > shapesSorted[numShapes - 1]
  const shapesSortedDesc = [...shapes].sort((a, b) => b.weight - a.weight);

  // 5. Bangkitkan neraca perbandingan berpasangan (A > B, B > C, C > D, dst.)
  const rawPairs: { heavier: ScaleShape; lighter: ScaleShape }[] = [];
  for (let i = 0; i < numShapes - 1; i++) {
    rawPairs.push({
      heavier: shapesSortedDesc[i],
      lighter: shapesSortedDesc[i + 1],
    });
  }

  // Acak urutan tampilan timbangan agar pemain tidak terbiasa dengan pola statis
  const shuffledPairs = shuffleArray(rawPairs);

  // Konversi menjadi ScalePair dengan acak penempatan piringan kiri/kanan
  const scales: ScalePair[] = shuffledPairs.map((pair, idx) => {
    const putHeavierOnLeft = Math.random() < 0.5;
    const leftShape = putHeavierOnLeft ? pair.heavier : pair.lighter;
    const rightShape = putHeavierOnLeft ? pair.lighter : pair.heavier;
    const tilt: 'left' | 'right' = putHeavierOnLeft ? 'left' : 'right';

    return {
      id: `scale-${level}-${trialIndex}-${idx}`,
      leftShape,
      rightShape,
      tilt,
    };
  });

  // 6. Pilih tipe pertanyaan
  let questionType: ScaleQuestionType = 'heaviest';
  if (numShapes === 3) {
    const rand = Math.random();
    if (rand < 0.45) {
      questionType = 'heaviest';
    } else if (rand < 0.8) {
      questionType = 'lightest';
    } else {
      questionType = 'median';
    }
  } else {
    // Untuk 4 atau 5 objek: fokus pada paling berat atau paling ringan
    questionType = Math.random() < 0.5 ? 'heaviest' : 'lightest';
  }

  // Tentukan jawaban benar berdasarkan tipe pertanyaan
  let correctShape: ScaleShape;
  let questionPrompt = '';

  if (questionType === 'heaviest') {
    correctShape = shapesSortedDesc[0]; // Terberat
    questionPrompt = 'Benda manakah yang PALING BERAT?';
  } else if (questionType === 'lightest') {
    correctShape = shapesSortedDesc[numShapes - 1]; // Teringan
    questionPrompt = 'Benda manakah yang PALING RINGAN?';
  } else {
    // Median (untuk 3 benda: indeks 1)
    correctShape = shapesSortedDesc[1];
    questionPrompt = 'Benda manakah yang BERBOBOT SEDANG (di tengah)?';
  }

  // 7. Opsi jawaban: acak seluruh bentuk yang terlibat
  const options = shuffleArray(shapes);

  return {
    trialIndex,
    level,
    shapes,
    scales,
    questionType,
    questionPrompt,
    correctShape,
    options,
    timeoutMs: calculateTimeoutForLevel(level),
  };
}
