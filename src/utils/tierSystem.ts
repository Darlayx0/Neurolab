import React from 'react';
import { Crown, Trophy, Gem, Medal, Award, Shield } from 'lucide-react';
import { ReflexMode, TierRank } from '../types';

export interface TierMetadata {
  rank: TierRank;
  name: string;
  badgeLabel: string;
  percentile: string;
  iconName: 'Crown' | 'Trophy' | 'Gem' | 'Medal' | 'Award' | 'Shield';
  iconColor: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  accentBg: string;
}

export const TIER_METADATA: Record<TierRank, TierMetadata> = {
  1: {
    rank: 1,
    name: 'Apex',
    badgeLabel: 'Grandmaster / Apex',
    percentile: 'Top 1% Populasi',
    iconName: 'Crown',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-300 font-black',
    badgeBg: 'bg-slate-950',
    badgeBorder: 'border-amber-400/70 shadow-xs shadow-amber-500/25 ring-1 ring-amber-400/30',
    accentBg: 'bg-slate-950 text-amber-400',
  },
  2: {
    rank: 2,
    name: 'Master',
    badgeLabel: 'Master / Superior',
    percentile: 'Top 5% Populasi',
    iconName: 'Trophy',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-700',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    accentBg: 'bg-purple-500/10',
  },
  3: {
    rank: 3,
    name: 'Diamond',
    badgeLabel: 'Diamond / Presisi Tinggi',
    percentile: 'Top 15% Populasi',
    iconName: 'Gem',
    iconColor: 'text-sky-600',
    textColor: 'text-sky-700',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    accentBg: 'bg-sky-500/10',
  },
  4: {
    rank: 4,
    name: 'Gold',
    badgeLabel: 'Gold / Mahir',
    percentile: 'Top 40% Populasi',
    iconName: 'Medal',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    accentBg: 'bg-amber-500/10',
  },
  5: {
    rank: 5,
    name: 'Silver',
    badgeLabel: 'Silver / Kompeten',
    percentile: 'Top 70% (Standar Sehat)',
    iconName: 'Award',
    iconColor: 'text-slate-600',
    textColor: 'text-slate-700',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    accentBg: 'bg-slate-500/10',
  },
  6: {
    rank: 6,
    name: 'Bronze',
    badgeLabel: 'Bronze / Adaptasi',
    percentile: 'Tahap Latihan Awal',
    iconName: 'Shield',
    iconColor: 'text-[#B87333]',
    textColor: 'text-[#96521E]',
    badgeBg: 'bg-[#B87333]/10',
    badgeBorder: 'border-[#B87333]/30',
    accentBg: 'bg-[#B87333]/15',
  },
};

export interface ModeTierThreshold {
  rank: TierRank;
  range: string;
  title: string;
  description: string;
  percentile: string;
}

export interface ModeStandardsConfig {
  mode: ReflexMode;
  title: string;
  metricLabel: string;
  unit: string;
  isLowerBetter: boolean;
  subModeTabs?: { id: string; label: string }[];
  tiers: ModeTierThreshold[];
  subModeTiers?: Record<string, ModeTierThreshold[]>;
}

export const ALL_MODE_TIER_STANDARDS: Record<ReflexMode, ModeStandardsConfig> = {
  visual: {
    mode: 'visual',
    title: 'Standar Tier Reaksi Visual',
    metricLabel: 'Waktu Latensi Rata-Rata',
    unit: 'ms',
    isLowerBetter: true,
    tiers: [
      { rank: 1, range: '< 180 ms', title: 'Apex Refleks / Transmisi Kilat', description: 'Kecepatan transmisi akson saraf optik luar biasa. Refleks tingkat atlet esports dunia (Top 1%).', percentile: 'Top 1%' },
      { rank: 2, range: '180 - 209 ms', title: 'Master Refleks / Sangat Cepat', description: 'Koordinasi visual-motorik sangat tajam, berada jauh di atas rata-rata populasi umum.', percentile: 'Top 5%' },
      { rank: 3, range: '210 - 239 ms', title: 'Diamond / Presisi Tinggi', description: 'Waktu respon sangat prima dengan konsistensi antar-ronde yang stabil.', percentile: 'Top 15%' },
      { rank: 4, range: '240 - 269 ms', title: 'Gold / Median Manusia Sehat', description: 'Rentang standar fisiologis manusia dewasa sehat (240 - 270 ms).', percentile: 'Top 40%' },
      { rank: 5, range: '270 - 320 ms', title: 'Silver / Sedikit Lambat', description: 'Masih dalam ambang fungsional wajar; dapat dioptimalkan dengan tidur cukup dan konsentrasi.', percentile: 'Top 70%' },
      { rank: 6, range: '> 320 ms', title: 'Bronze / Tahap Adaptasi', description: 'Respon melambat akibat kelelahan sistem saraf pusat atau distraksi lingkungan.', percentile: 'Tahap Awal' },
    ],
  },
  audio: {
    mode: 'audio',
    title: 'Standar Tier Reaksi Suara',
    metricLabel: 'Latensi Auditori',
    unit: 'ms',
    isLowerBetter: true,
    subModeTabs: [
      { id: 'freq_440', label: '440 Hz (Rendah)' },
      { id: 'freq_880', label: '880 Hz (Standar)' },
      { id: 'freq_1760', label: '1760 Hz (Tinggi)' },
    ],
    tiers: [
      { rank: 1, range: '< 150 ms', title: 'Apex Auditori / Musisi Pro', description: 'Latensi transmisi koklea-korteks-motorik tercepat. Jalur saraf akustik ultra-responsif (<150ms).', percentile: 'Top 1%' },
      { rank: 2, range: '150 - 179 ms', title: 'Master Akustik / Cepat & Tanggap', description: 'Respon pendengaran jauh lebih cepat dari visual dan melampaui mayoritas orang dewasa.', percentile: 'Top 5%' },
      { rank: 3, range: '180 - 209 ms', title: 'Diamond / Kepekaan Tajam', description: 'Refleks pendengaran stabil dan cepat membedakan kemunculan gelombang frekuensi.', percentile: 'Top 15%' },
      { rank: 4, range: '210 - 239 ms', title: 'Gold / Standar Pendengaran Sehat', description: 'Rentang waktu respon akustik normal manusia pada lingkungan tenang.', percentile: 'Top 40%' },
      { rank: 5, range: '240 - 280 ms', title: 'Silver / Perlu Peningkatan Fokus', description: 'Sedikit terlambat merespons hentakan nada suara; butuh lingkungan hening.', percentile: 'Top 70%' },
      { rank: 6, range: '> 280 ms', title: 'Bronze / Respon Tertunda', description: 'Transmisi stimulus nada mengalami jeda waktu pemrosesan kognitif.', percentile: 'Tahap Awal' },
    ],
  },
  memory: {
    mode: 'memory',
    title: 'Standar Tier Memori Spasial',
    metricLabel: 'Level Memori Tertinggi',
    unit: 'Level',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ Level 12', title: 'Apex / Chimp Memory Phenomenon', description: 'Kapasitas visuospatial working memory tingkat keajaiban kognitif (12+ urutan angka acak).', percentile: 'Top 1%' },
      { rank: 2, range: 'Level 10 - 11', title: 'Master / Memori Spasial Superior', description: 'Daya ingat spasial seketika tingkat tinggi; mampu memetakan 10-11 posisi sekaligus.', percentile: 'Top 5%' },
      { rank: 3, range: 'Level 8 - 9', title: 'Diamond / Daya Ingat Sangat Kuat', description: 'Melampaui Hukum Miller (7±2) dengan memanfaatkan teknik chunking visual yang efisien.', percentile: 'Top 15%' },
      { rank: 4, range: 'Level 6 - 7', title: 'Gold / Standar Manusia Sehat', description: 'Rentang kapasitas memori jangka pendek standar manusia dewasa (6-7 unit acak).', percentile: 'Top 40%' },
      { rank: 5, range: 'Level 4 - 5', title: 'Silver / Retensi Dasar', description: 'Mampu menahan 4-5 urutan posisi kartu secara konsisten sebelum terjadi kebingungan.', percentile: 'Top 70%' },
      { rank: 6, range: '< Level 4', title: 'Bronze / Tahap Pembiasaan', description: 'Daya ingat spasial seketika masih membutuhkan adaptasi terhadap pola matriks.', percentile: 'Tahap Awal' },
    ],
  },
  color_memory: {
    mode: 'color_memory',
    title: 'Standar Tier Memori Kromatik',
    metricLabel: 'Level Tertinggi Tuntas',
    unit: 'Level',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ Level 14', title: 'Apex / Retensi Spektrum Sempurna', description: 'Kapasitas feature binding spasial-kromatik luar biasa. Mampu memetakan matriks 6x6 dengan variasi hingga 8 warna tanpa cela.', percentile: 'Top 1%' },
      { rank: 2, range: 'Level 11 - 13', title: 'Master / Memori Spektrum Superior', description: 'Daya ingat visual sangat tajam. Menguasai matriks 5x5 dan transisi ke 6x6 dengan presisi warna tinggi.', percentile: 'Top 5%' },
      { rank: 3, range: 'Level 8 - 10', title: 'Diamond / Presisi Spasial Tinggi', description: 'Retensi memori kerja stabil pada matriks 5x5 dan seleksi warna target tanpa keraguan.', percentile: 'Top 15%' },
      { rank: 4, range: 'Level 5 - 7', title: 'Gold / Memori Visual Mahir', description: 'Mampu menguasai matriks 4x4 dengan 4 variasi warna secara konsisten.', percentile: 'Top 40%' },
      { rank: 5, range: 'Level 3 - 4', title: 'Silver / Retensi Warna Dasar', description: 'Rentang standar sehat; stabil pada matriks 3x3 dan mulai tertantang pada matriks 4x4.', percentile: 'Top 70%' },
      { rank: 6, range: '< Level 3', title: 'Bronze / Adaptasi Pengikatan Warna', description: 'Daya ingat fitur warna dan posisi spasial masih memerlukan latihan konsolidasi visual.', percentile: 'Tahap Awal' },
    ],
  },
  motor: {
    mode: 'motor',
    title: 'Standar Tier Koordinasi Motorik',
    metricLabel: 'Net Hits 60 Detik',
    unit: 'Net Hits',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ 75 Net Hits', title: 'Apex / Pro Aim Esports', description: 'Kecepatan akuisisi target tingkat atlet penembak profesional (>1.25 hit/detik murni) tanpa meleset.', percentile: 'Top 1%' },
      { rank: 2, range: '60 - 74 Net Hits', title: 'Master / Presisi & Lincah', description: 'Koordinasi mata-tangan sangat tangkas, ritme ketukan stabil dan minim penalti meleset.', percentile: 'Top 5%' },
      { rank: 3, range: '45 - 59 Net Hits', title: 'Diamond / Motorik Prima', description: 'Kecepatan membidik target di atas rata-rata dengan ketahanan otot jari yang konsisten.', percentile: 'Top 15%' },
      { rank: 4, range: '32 - 44 Net Hits', title: 'Gold / Normal Aktif Sehat', description: 'Rentang standar kecepatan koordinasi motorik orang dewasa aktif.', percentile: 'Top 40%' },
      { rank: 5, range: '20 - 31 Net Hits', title: 'Silver / Ketahanan Dasar', description: 'Mulai mengalami penurunan akurasi atau perlambatan di paruh akhir durasi 60 detik.', percentile: 'Top 70%' },
      { rank: 6, range: '< 20 Net Hits', title: 'Bronze / Penurunan Akurasi', description: 'Banyak ketukan meleset atau jeda pencarian posisi target terlalu panjang.', percentile: 'Tahap Awal' },
    ],
  },
  concentration: {
    mode: 'concentration',
    title: 'Standar Tier Tantangan Konsentrasi',
    metricLabel: 'Waktu Respon Efektif',
    unit: 'ms',
    isLowerBetter: true,
    tiers: [
      { rank: 1, range: '< 250 ms', title: 'Apex / Inhibisi Saraf Sempurna', description: 'Kontrol inhibisi respon luar biasa. Mampu menyaring stimulus No-Go tanpa ada false trigger (<250ms).', percentile: 'Top 1%' },
      { rank: 2, range: '250 - 319 ms', title: 'Master / Kewaspadaan Tinggi', description: 'Fokus selektif sangat prima dalam membedakan warna sah dan menahan impuls jebakan.', percentile: 'Top 5%' },
      { rank: 3, range: '320 - 399 ms', title: 'Diamond / Kontrol Impuls Stabil', description: 'Respon cepat dengan kehati-hatian yang matang terhadap perubahan visual acak.', percentile: 'Top 15%' },
      { rank: 4, range: '400 - 479 ms', title: 'Gold / Konsentrasi Standar Sehat', description: 'Kecepatan normal manusia saat menghadapi stimulus pembeda Go/No-Go.', percentile: 'Top 40%' },
      { rank: 5, range: '480 - 559 ms', title: 'Silver / Konsentrasi Terbagi', description: 'Terdapat penalti false start atau keraguan saat menyaring stimulus jebakan.', percentile: 'Top 70%' },
      { rank: 6, range: '≥ 560 ms', title: 'Bronze / Impulsif / Kelelahan Fokus', description: 'Banyak pelanggaran ketukan prematur atau kesulitan menahan impuls motorik.', percentile: 'Tahap Awal' },
    ],
  },
  digit_span: {
    mode: 'digit_span',
    title: 'Standar Tier Ingatan Angka',
    metricLabel: 'Panjang Rantai Digit',
    unit: 'Digit',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ 11 Digit', title: 'Apex / Master Mnemonik Dunia', description: 'Kapasitas retensi memori kerja luar biasa (11+ digit). Berada di jajaran 1% teratas.', percentile: 'Top 1%' },
      { rank: 2, range: '9 - 10 Digit', title: 'Master / Memori Kerja Superior', description: 'Kemampuan phonological loop sangat optimal dalam mengelompokkan urutan angka panjang.', percentile: 'Top 5%' },
      { rank: 3, range: '7 - 8 Digit', title: 'Diamond / Retensi Di Atas Rata-Rata', description: 'Melampaui kapasitas rata-rata dengan teknik pengelompokan ritme yang cerdas.', percentile: 'Top 15%' },
      { rank: 4, range: '6 Digit', title: 'Gold / Standar Manusia Sehat', description: 'Kapasitas standar memori kerja orang dewasa sehat (Hukum George Miller 7±2).', percentile: 'Top 40%' },
      { rank: 5, range: '4 - 5 Digit', title: 'Silver / Kapasitas Retensi Dasar', description: 'Kapasitas standar dasar; dapat ditingkatkan dengan latihan chunking angka berkala.', percentile: 'Top 70%' },
      { rank: 6, range: '< 4 Digit', title: 'Bronze / Tahap Latihan Retensi', description: 'Kesulitan menahan urutan digit pendek; latih ketenangan pikiran saat mengingat.', percentile: 'Tahap Awal' },
    ],
  },
  nback: {
    mode: 'nback',
    title: 'Standar Tier Penyelarasan Memori',
    metricLabel: 'Akurasi Penyelarasan',
    unit: '%',
    isLowerBetter: false,
    subModeTabs: [
      { id: '1_back', label: '1-Back (Dasar)' },
      { id: '2_back', label: '2-Back (Standar)' },
      { id: '3_back', label: '3-Back (Pakar)' },
    ],
    tiers: [
      { rank: 1, range: '≥ 95%', title: 'Apex / Master Memori Kerja', description: 'Penyimpanan simultan dan pembaruan memori berlangsung instan tanpa distorsi informasi.', percentile: 'Top 1%' },
      { rank: 2, range: '88 - 94%', title: 'Master / Penyelarasan Cepat', description: 'Memori kerja kontinu sangat kuat; mampu menyaring pengalih dan mengenali target tepat waktu.', percentile: 'Top 5%' },
      { rank: 3, range: '80 - 87%', title: 'Diamond / Presisi Tinggi', description: 'Daya ingat sekuensial konsisten dengan tingkat false positive yang minimal.', percentile: 'Top 15%' },
      { rank: 4, range: '70 - 79%', title: 'Gold / Normal Sehat', description: 'Batas performa standar orang dewasa pada pengujian memori kerja sekuensial.', percentile: 'Top 40%' },
      { rank: 5, range: '60 - 69%', title: 'Silver / Beban Kognitif Terasa', description: 'Rantai ingatan mulai terputus saat urutan huruf berubah dengan tempo cepat.', percentile: 'Top 70%' },
      { rank: 6, range: '< 60%', title: 'Bronze / Tahap Adaptasi Irama', description: 'Otak masih kesulitan menyeimbangkan antara mengingat stimulus lama dan membaca stimulus baru.', percentile: 'Tahap Awal' },
    ],
    subModeTiers: {
      '1_back': [
        { rank: 1, range: '100%', title: 'Apex / Refleks Memori Sempurna', description: 'Pembaruan memori 1 langkah bekerja otomatis dan instan tanpa ada satu pun kesalahan.', percentile: 'Top 1%' },
        { rank: 2, range: '95 - 99%', title: 'Master / Sangat Tanggap & Fokus', description: 'Mampu mengenali perulangan huruf 1 langkah lalu dengan cepat dan tepat.', percentile: 'Top 5%' },
        { rank: 3, range: '90 - 94%', title: 'Diamond / Presisi Konsisten', description: 'Akurasi prima dengan deteksi stimulus yang rapi dan konsisten.', percentile: 'Top 15%' },
        { rank: 4, range: '80 - 89%', title: 'Gold / Standar Sehat', description: 'Kapasitas normal ingatan jangka pendek manusia dalam mendeteksi kesamaan.', percentile: 'Top 40%' },
        { rank: 5, range: '70 - 79%', title: 'Silver / Butuh Adaptasi Irama', description: 'Sesekali terlambat bereaksi atau melakukan penekanan terburu-buru.', percentile: 'Top 70%' },
        { rank: 6, range: '< 70%', title: 'Bronze / Latihan Dasar', description: 'Fokus mudah teralihkan; disarankan berlatih menjaga ritme tatapan layar.', percentile: 'Tahap Awal' },
      ],
      '2_back': [
        { rank: 1, range: '≥ 95%', title: 'Apex / Master Memori Kerja', description: 'Kemampuan luar biasa menyimpan 2 huruf sebelumnya sambil membaca huruf baru secara bersamaan.', percentile: 'Top 1%' },
        { rank: 2, range: '88 - 94%', title: 'Master / Tajam & Berdaya Ingat Kuat', description: 'Memori kerja sangat sehat; mampu mengabaikan gangguan dan mengenali pola 2 langkah lalu.', percentile: 'Top 5%' },
        { rank: 3, range: '80 - 87%', title: 'Diamond / Presisi Tinggi', description: 'Performa di atas rata-rata dalam menjaga rantai ingatan sekuensial ganda.', percentile: 'Top 15%' },
        { rank: 4, range: '70 - 79%', title: 'Gold / Standar Sehat', description: 'Batas normal performa orang dewasa pada tugas memori kerja 2-Back.', percentile: 'Top 40%' },
        { rank: 5, range: '60 - 69%', title: 'Silver / Mulai Beban Kognitif', description: 'Rantai ingatan 2 langkah sering terputus di tengah sesi akibat lupa huruf sebelumnya.', percentile: 'Top 70%' },
        { rank: 6, range: '< 60%', title: 'Bronze / Pembiasaan Memori Ganda', description: 'Memerlukan latihan untuk membagi tugas antara menyimpan informasi lama dan input baru.', percentile: 'Tahap Awal' },
      ],
      '3_back': [
        { rank: 1, range: '≥ 85%', title: 'Apex / Jenius Neuro Prodigy', description: 'Tingkat elit (Top 1%). Kapasitas memori kerja kontinu luar biasa mempertahankan 3 data sekuensial.', percentile: 'Top 1%' },
        { rank: 2, range: '76 - 84%', title: 'Master / Sangat Unggul & Tangguh', description: 'Berhasil menahan benturan informasi kompleks dan mengenali stimulus 3 langkah lalu.', percentile: 'Top 5%' },
        { rank: 3, range: '68 - 75%', title: 'Diamond / Presisi Tinggi di Level Berat', description: 'Performa solid untuk variasi 3-Back dengan akurasi dan ketahanan mental tinggi.', percentile: 'Top 15%' },
        { rank: 4, range: '58 - 67%', title: 'Gold / Kapasitas Baik', description: 'Mampu bertahan dalam siklus 3-Back dengan tingkat deteksi yang memadai.', percentile: 'Top 40%' },
        { rank: 5, range: '48 - 57%', title: 'Silver / Rentan Interferensi Data', description: 'Sering tertukar antara huruf 2 langkah lalu dengan 3 langkah lalu.', percentile: 'Top 70%' },
        { rank: 6, range: '< 48%', title: 'Bronze / Butuh Fondasi di 2-Back', description: 'Beban kognitif terlalu berat; disarankan menguasai level 2-Back terlebih dahulu.', percentile: 'Tahap Awal' },
      ],
    },
  },
  matrix: {
    mode: 'matrix',
    title: 'Standar Tier Pemindaian Angka',
    metricLabel: 'Waktu Total Selesai',
    unit: 'detik',
    isLowerBetter: true,
    subModeTabs: [
      { id: 'grid_4', label: 'Grid 4x4 (16 Angka)' },
      { id: 'grid_5', label: 'Grid 5x5 (25 Angka)' },
      { id: 'grid_6', label: 'Grid 6x6 (36 Angka)' },
    ],
    tiers: [
      { rank: 1, range: '≤ 15.0s', title: 'Apex / Master Visi Perifer', description: 'Tingkat elit atlet kognitif (<0.6s/angka). Pandangan mata menyerap seluruh bidang ubin sekaligus.', percentile: 'Top 1%' },
      { rank: 2, range: '15.1s - 19.0s', title: 'Master / Pemindaian Cepat & Tajam', description: 'Pemrosesan visual sangat efisien dengan ritme ketukan yang konsisten dan rapi.', percentile: 'Top 5%' },
      { rank: 3, range: '19.1s - 24.0s', title: 'Diamond / Presisi Tinggi', description: 'Koordinasi mata-tangan sangat lancar tanpa jeda pencarian yang berarti.', percentile: 'Top 15%' },
      { rank: 4, range: '24.1s - 30.0s', title: 'Gold / Standar Manusia Sehat', description: 'Catatan waktu normal populasi umum pada uji Schulte Table 25 angka tanpa penalti.', percentile: 'Top 40%' },
      { rank: 5, range: '30.1s - 40.0s', title: 'Silver / Beban Visual Meningkat', description: 'Sering kehilangan jejak lokasi angka berikutnya saat mencari di area perifer.', percentile: 'Top 70%' },
      { rank: 6, range: '> 40.0s', title: 'Bronze / Latihan Fokus Luas', description: 'Rentang fokus mata masih terlalu sempit atau ritme terganggu akibat salah klik.', percentile: 'Tahap Awal' },
    ],
    subModeTiers: {
      'grid_4': [
        { rank: 1, range: '≤ 7.5s', title: 'Apex / Pemindai Kilat Pro', description: 'Kecepatan pemindaian visual luar biasa (<0.47s/angka). Visi perifer bekerja sempurna.', percentile: 'Top 1%' },
        { rank: 2, range: '7.6s - 9.5s', title: 'Master / Sangat Cepat & Gesit', description: 'Koordinasi mata-tangan sangat lancar tanpa keraguan mencari 16 angka.', percentile: 'Top 5%' },
        { rank: 3, range: '9.6s - 12.0s', title: 'Diamond / Presisi Tinggi', description: 'Pemindaian visual lancar dan ritmis pada matriks 16 angka.', percentile: 'Top 15%' },
        { rank: 4, range: '12.1s - 15.5s', title: 'Gold / Standar Normal Sehat', description: 'Batas kecepatan standar manusia sehat dalam memindai 16 petak acak.', percentile: 'Top 40%' },
        { rank: 5, range: '15.6s - 20.0s', title: 'Silver / Butuh Adaptasi Bidang Pandang', description: 'Gerakan mata masih berpindah-pindah acak tanpa memanfaatkan pandangan tepi.', percentile: 'Top 70%' },
        { rank: 6, range: '> 20.0s', title: 'Bronze / Perlu Latihan Pemindaian', description: 'Membutuhkan waktu lama untuk mencari lokasi angka atau terkena penalti salah klik.', percentile: 'Tahap Awal' },
      ],
      'grid_5': [
        { rank: 1, range: '≤ 15.0s', title: 'Apex / Master Visi Perifer', description: 'Tingkat elit atlet kognitif (<0.6s/angka). Pandangan mata menyerap seluruh bidang ubin sekaligus.', percentile: 'Top 1%' },
        { rank: 2, range: '15.1s - 19.0s', title: 'Master / Pemindaian Cepat & Tajam', description: 'Pemrosesan visual sangat efisien dengan ritme ketukan yang konsisten dan rapi.', percentile: 'Top 5%' },
        { rank: 3, range: '19.1s - 24.0s', title: 'Diamond / Presisi Tinggi', description: 'Koordinasi mata-tangan sangat lancar tanpa jeda pencarian yang berarti.', percentile: 'Top 15%' },
        { rank: 4, range: '24.1s - 30.0s', title: 'Gold / Standar Manusia Sehat', description: 'Catatan waktu normal populasi umum pada uji Schulte Table 25 angka tanpa penalti.', percentile: 'Top 40%' },
        { rank: 5, range: '30.1s - 40.0s', title: 'Silver / Beban Visual Meningkat', description: 'Sering kehilangan jejak lokasi angka berikutnya saat mencari di area perifer.', percentile: 'Top 70%' },
        { rank: 6, range: '> 40.0s', title: 'Bronze / Latihan Fokus Luas', description: 'Rentang fokus mata masih terlalu sempit atau ritme terganggu akibat salah klik.', percentile: 'Tahap Awal' },
      ],
      'grid_6': [
        { rank: 1, range: '≤ 26.0s', title: 'Apex / Jenius Visual 36 Angka', description: 'Performa tingkat tinggi dalam mengurai kepadatan 36 angka sekuensial dengan presisi mutlak.', percentile: 'Top 1%' },
        { rank: 2, range: '26.1s - 33.0s', title: 'Master / Sangat Unggul & Tangguh', description: 'Daya tahan konsentrasi tinggi; ritme pemindaian tetap cepat hingga ubin terakhir.', percentile: 'Top 5%' },
        { rank: 3, range: '33.1s - 42.0s', title: 'Diamond / Presisi Tinggi di Matriks Besar', description: 'Mampu mempertahankan pemindaian tajam pada 36 angka tanpa kehilangan fokus.', percentile: 'Top 15%' },
        { rank: 4, range: '42.1s - 54.0s', title: 'Gold / Kapasitas Solid di Level Berat', description: 'Performa stabil dan mampu menyelesaikan grid 36 angka dengan efisiensi memadai.', percentile: 'Top 40%' },
        { rank: 5, range: '54.1s - 70.0s', title: 'Silver / Mengalami Kelelahan Fokus', description: 'Kecepatan melambat di paruh akhir sesi karena kelelahan visual atau penalti bertumpuk.', percentile: 'Top 70%' },
        { rank: 6, range: '> 70.0s', title: 'Bronze / Butuh Fondasi di Grid 5x5', description: 'Kesulitan mengelola 36 ubin acak; disarankan melatih kecepatan dasar di grid 4x4 atau 5x5.', percentile: 'Tahap Awal' },
      ],
    },
  },
  tracking: {
    mode: 'tracking',
    title: 'Standar Tier Pelacakan Objek',
    metricLabel: 'Level Tuntas Sempurna',
    unit: 'Level',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ Level 10', title: 'Apex / Persepsi Spasial Superhuman', description: 'Kapasitas Multiple Object Tracking luar biasa dalam mengisolasi ≥6 target dinamis simultan.', percentile: 'Top 1%' },
      { rank: 2, range: 'Level 8 - 9', title: 'Master / Mata Predator & Multi-Fokus', description: 'Koordinasi perhatian terbagi sangat tajam dan tidak goyah oleh tabrakan bola pengecoh.', percentile: 'Top 5%' },
      { rank: 3, range: 'Level 6 - 7', title: 'Diamond / Pelacakan Spasial Tangkas', description: 'Mampu melacak 4-5 target bersilangan dengan konsentrasi tenang dan ritme stabil.', percentile: 'Top 15%' },
      { rank: 4, range: 'Level 4 - 5', title: 'Gold / Pelacakan Normal Tinggi', description: 'Rentang standar orang dewasa sehat dalam melacak 3 target yang bergerak aktif.', percentile: 'Top 40%' },
      { rank: 5, range: 'Level 2 - 3', title: 'Silver / Fokus Spasial Dasar', description: 'Menguasai pelacakan target dasar (2-3 target); mulai terbebani saat kecepatan meningkat.', percentile: 'Top 70%' },
      { rank: 6, range: '< Level 2', title: 'Bronze / Tahap Adaptasi Gerak', description: 'Pandangan mata mudah teralihkan oleh bola pengecoh; jaga fokus periferal tetap rileks.', percentile: 'Tahap Awal' },
    ],
  },
  chromatic: {
    mode: 'chromatic',
    title: 'Standar Tier Pembeda Warna Anomali',
    metricLabel: 'Level Tertinggi 60 Detik',
    unit: 'Level',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ Level 24', title: 'Apex / Persepsi Tetrachromat Superhuman', description: 'Sensitivitas fotoreseptor kerucut retina berada di 1% teratas. Mampu membedakan deviasi luminansi mikro <1.5%.', percentile: 'Top 1%' },
      { rank: 2, range: 'Level 18 - 23', title: 'Master / Mata Elang (Hawk Eye)', description: 'Ketajaman visual sangat superior. Pemindaian 25 petak bekerja konsisten di bawah perbedaan gradasi sangat halus.', percentile: 'Top 5%' },
      { rank: 3, range: 'Level 13 - 17', title: 'Diamond / Pengamat Tajam & Cepat', description: 'Sensitivitas kontras warna halus stabil dan memiliki refleks putusan visual yang cepat serta akurat.', percentile: 'Top 15%' },
      { rank: 4, range: 'Level 9 - 12', title: 'Gold / Sensitivitas Normal Sehat', description: 'Rentang standar persepsi mata manusia sehat. Mulai melambat ketika perbedaan warna menyusut di bawah 5%.', percentile: 'Top 40%' },
      { rank: 5, range: 'Level 5 - 8', title: 'Silver / Sensitivitas Dasar', description: 'Mampu mendeteksi warna kontras awal, namun terhenti saat menghadapi variasi saturasi tipis.', percentile: 'Top 70%' },
      { rank: 6, range: '< Level 5', title: 'Bronze / Tahap Adaptasi Retina', description: 'Mata masih membutuhkan adaptasi terhadap spektrum warna atau terkena penalti waktu akibat salah klik.', percentile: 'Tahap Awal' },
    ],
  },
  switching: {
    mode: 'switching',
    title: 'Standar Tier Pengalihan Pola',
    metricLabel: 'Switch Cost Efektif',
    unit: 'ms',
    isLowerBetter: true,
    tiers: [
      { rank: 1, range: '< 90 ms', title: 'Apex / Neural Reconfiguration Prodigy', description: 'Biaya transisi mental mendekati nol. Arsitektur prefrontal mampu mengganti set aturan kognitif secara instan tanpa friksi.', percentile: 'Top 1%' },
      { rank: 2, range: '90 - 149 ms', title: 'Master / Adaptasi Mental Sangat Cepat', description: 'Transisi antar konteks logika berlangsung mulus dengan akurasi prima dan inhibisi interferensi yang stabil.', percentile: 'Top 5%' },
      { rank: 3, range: '150 - 219 ms', title: 'Diamond / Fleksibilitas Kognitif Unggul', description: 'Kontrol eksekutif tangkas. Mampu membedakan domain paritas dan besaran dengan latensi pergantian yang rendah.', percentile: 'Top 15%' },
      { rank: 4, range: '220 - 299 ms', title: 'Gold / Standar Fleksibilitas Dewasa Sehat', description: 'Rentang normal populasi manusia dewasa sehat. Terdapat jeda adaptasi alami saat aturan logika berganti.', percentile: 'Top 40%' },
      { rank: 5, range: '300 - 399 ms', title: 'Silver / Inersia Kognitif Sedang', description: 'Mengalami perlambatan akibat residu aturan sebelumnya (task-set inertia) atau terdapat penalti salah penekanan.', percentile: 'Top 70%' },
      { rank: 6, range: '≥ 400 ms', title: 'Bronze / Rigiditas / Kelelahan Eksekutif', description: 'Keterlambatan adaptasi tinggi atau kebingungan membedakan aturan akibat kelelahan sirkuit prefrontal.', percentile: 'Tahap Awal' },
    ],
  },
  temporal: {
    mode: 'temporal',
    title: 'Standar Tier Estimasi Waktu',
    metricLabel: 'Rerata Deviasi Waktu',
    unit: 'ms',
    isLowerBetter: true,
    tiers: [
      { rank: 1, range: '≤ 80 ms', title: 'Apex / Presisi Metronom Biologis', description: 'Jam internal biologis setara metronom profesional. Mampu menakar interval durasi murni tanpa visual dengan presisi mikronik.', percentile: 'Top 1%' },
      { rank: 2, range: '81 - 150 ms', title: 'Master / Ritme Batin Sangat Stabil', description: 'Persepsi kronometri sangat tajam. Ritme fokus internal konsisten dengan deviasi temporal sangat minimal.', percentile: 'Top 5%' },
      { rank: 3, range: '151 - 250 ms', title: 'Diamond / Penaksir Waktu Unggul', description: 'Sensitivitas interval waktu di atas rata-rata populasi. Memiliki kontrol ketenangan mental yang teratur.', percentile: 'Top 15%' },
      { rank: 4, range: '251 - 400 ms', title: 'Gold / Standar Persepsi Waktu Sehat', description: 'Rentang normal manusia sehat. Perkiraan interval waktu relatif stabil pada durasi pendek hingga menengah.', percentile: 'Top 40%' },
      { rank: 5, range: '401 - 600 ms', title: 'Silver / Fluktuasi Ritme Subyektif', description: 'Penghitungan durasi batin mudah terpengaruh oleh debaran ritme napas atau kecenderungan terburu-buru.', percentile: 'Top 70%' },
      { rank: 6, range: '> 600 ms', title: 'Bronze / Perlu Latihan Ritme Internal', description: 'Penyimpangan estimasi waktu masih tinggi akibat ketergesaan atau kesulitan fokus tanpa penunjuk visual.', percentile: 'Tahap Awal' },
    ],
  },
  flanker: {
    mode: 'flanker',
    title: 'Standar Tier Inhibisi Flanker',
    metricLabel: 'Total Skor Performa',
    unit: 'Poin',
    isLowerBetter: false,
    tiers: [
      { rank: 1, range: '≥ 900 Poin', title: 'Apex / Master Inhibisi Prefrontal', description: 'Filter foveal prima dengan supresi respons impulsif mendekati mutlak. Beban konflik distraktor dominan diselesaikan tanpa keraguan di tempo tercepat.', percentile: 'Top 1%' },
      { rank: 2, range: '800 - 899 Poin', title: 'Master / Resolusi Konflik Sangat Tangkas', description: 'Mampu menyaring 4 kartu distraktor masif dan beradaptasi mulus dengan pembalikan aturan di bawah tekanan durasi waktu yang menyusut.', percentile: 'Top 5%' },
      { rank: 3, range: '700 - 799 Poin', title: 'Diamond / Kontrol Eksekutif Unggul', description: 'Akurasi tinggi dan supresi impuls stabil; ritme reaksi tetap terjaga saat durasi waktu trial mulai menyusut cepat.', percentile: 'Top 15%' },
      { rank: 4, range: '600 - 699 Poin', title: 'Gold / Standar Kontrol Impuls Sehat', description: 'Rentang normal populasi dewasa sehat. Mampu menguasai tempo awal hingga menengah dengan konsistensi baik.', percentile: 'Top 40%' },
      { rank: 5, range: '500 - 599 Poin', title: 'Silver / Rentan Distraksi Cepat', description: 'Terjadi beberapa kesalahan tekan akibat dorongan impuls spontan saat durasi waktu trial semakin menyempit.', percentile: 'Top 70%' },
      { rank: 6, range: '< 500 Poin', title: 'Bronze / Tahap Adaptasi Inhibisi', description: 'Akurasi terganggu oleh arah panah distraktor dominan atau kehabisan batas waktu pada fase kritis.', percentile: 'Tahap Awal' },
    ],
  },
};

/**
 * Universal evaluation function calculating the exact TierRank and metadata
 * for any score in any of the 10 modes and their sub-modes.
 */
export function evaluateScoreTier(
  mode: ReflexMode,
  score: number | null | undefined,
  subMode?: string
): {
  rank: TierRank | null;
  tierName: string;
  badgeLabel: string;
  percentile: string;
  colorClass: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  desc: string;
} {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      rank: null,
      tierName: 'Unranked',
      badgeLabel: 'Belum Ada Rekor',
      percentile: '-',
      colorClass: 'text-slate-400',
      textColor: 'text-slate-500',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
      desc: 'Selesaikan sesi pengujian untuk mendapatkan penentuan tier dan evaluasi fisiologis.',
    };
  }

  let calculatedRank: TierRank = 6;
  let customDesc = '';

  switch (mode) {
    case 'visual': {
      if (score < 180) calculatedRank = 1;
      else if (score < 210) calculatedRank = 2;
      else if (score < 240) calculatedRank = 3;
      else if (score < 270) calculatedRank = 4;
      else if (score <= 320) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'audio': {
      if (score < 150) calculatedRank = 1;
      else if (score < 180) calculatedRank = 2;
      else if (score < 210) calculatedRank = 3;
      else if (score < 240) calculatedRank = 4;
      else if (score <= 280) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'memory': {
      if (score >= 12) calculatedRank = 1;
      else if (score >= 10) calculatedRank = 2;
      else if (score >= 8) calculatedRank = 3;
      else if (score >= 6) calculatedRank = 4;
      else if (score >= 4) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'color_memory': {
      if (score >= 14) calculatedRank = 1;
      else if (score >= 11) calculatedRank = 2;
      else if (score >= 8) calculatedRank = 3;
      else if (score >= 5) calculatedRank = 4;
      else if (score >= 3) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'motor': {
      if (score >= 75) calculatedRank = 1;
      else if (score >= 60) calculatedRank = 2;
      else if (score >= 45) calculatedRank = 3;
      else if (score >= 32) calculatedRank = 4;
      else if (score >= 20) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'concentration': {
      if (score < 250) calculatedRank = 1;
      else if (score < 320) calculatedRank = 2;
      else if (score < 400) calculatedRank = 3;
      else if (score < 480) calculatedRank = 4;
      else if (score < 560) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'digit_span': {
      if (score >= 11) calculatedRank = 1;
      else if (score >= 9) calculatedRank = 2;
      else if (score >= 7) calculatedRank = 3;
      else if (score >= 6) calculatedRank = 4;
      else if (score >= 4) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'nback': {
      if (subMode === '1_back') {
        if (score >= 100) calculatedRank = 1;
        else if (score >= 95) calculatedRank = 2;
        else if (score >= 90) calculatedRank = 3;
        else if (score >= 80) calculatedRank = 4;
        else if (score >= 70) calculatedRank = 5;
        else calculatedRank = 6;
      } else if (subMode === '3_back') {
        if (score >= 85) calculatedRank = 1;
        else if (score >= 76) calculatedRank = 2;
        else if (score >= 68) calculatedRank = 3;
        else if (score >= 58) calculatedRank = 4;
        else if (score >= 48) calculatedRank = 5;
        else calculatedRank = 6;
      } else {
        // default 2-back
        if (score >= 95) calculatedRank = 1;
        else if (score >= 88) calculatedRank = 2;
        else if (score >= 80) calculatedRank = 3;
        else if (score >= 70) calculatedRank = 4;
        else if (score >= 60) calculatedRank = 5;
        else calculatedRank = 6;
      }
      break;
    }
    case 'matrix': {
      if (subMode === 'grid_4') {
        if (score <= 7.5) calculatedRank = 1;
        else if (score <= 9.5) calculatedRank = 2;
        else if (score <= 12.0) calculatedRank = 3;
        else if (score <= 15.5) calculatedRank = 4;
        else if (score <= 20.0) calculatedRank = 5;
        else calculatedRank = 6;
      } else if (subMode === 'grid_6') {
        if (score <= 26.0) calculatedRank = 1;
        else if (score <= 33.0) calculatedRank = 2;
        else if (score <= 42.0) calculatedRank = 3;
        else if (score <= 54.0) calculatedRank = 4;
        else if (score <= 70.0) calculatedRank = 5;
        else calculatedRank = 6;
      } else {
        // default grid_5
        if (score <= 15.0) calculatedRank = 1;
        else if (score <= 19.0) calculatedRank = 2;
        else if (score <= 24.0) calculatedRank = 3;
        else if (score <= 30.0) calculatedRank = 4;
        else if (score <= 40.0) calculatedRank = 5;
        else calculatedRank = 6;
      }
      break;
    }
    case 'tracking': {
      if (score >= 10) calculatedRank = 1;
      else if (score >= 8) calculatedRank = 2;
      else if (score >= 6) calculatedRank = 3;
      else if (score >= 4) calculatedRank = 4;
      else if (score >= 2) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'chromatic': {
      if (score >= 24) calculatedRank = 1;
      else if (score >= 18) calculatedRank = 2;
      else if (score >= 13) calculatedRank = 3;
      else if (score >= 9) calculatedRank = 4;
      else if (score >= 5) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'switching': {
      if (score < 90) calculatedRank = 1;
      else if (score < 150) calculatedRank = 2;
      else if (score < 220) calculatedRank = 3;
      else if (score < 300) calculatedRank = 4;
      else if (score < 400) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'temporal': {
      if (score <= 80) calculatedRank = 1;
      else if (score <= 150) calculatedRank = 2;
      else if (score <= 250) calculatedRank = 3;
      else if (score <= 400) calculatedRank = 4;
      else if (score <= 600) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    case 'flanker': {
      if (score >= 900) calculatedRank = 1;
      else if (score >= 800) calculatedRank = 2;
      else if (score >= 700) calculatedRank = 3;
      else if (score >= 600) calculatedRank = 4;
      else if (score >= 500) calculatedRank = 5;
      else calculatedRank = 6;
      break;
    }
    default:
      calculatedRank = 4;
  }

  const meta = TIER_METADATA[calculatedRank];
  const modeConfig = ALL_MODE_TIER_STANDARDS[mode];
  const tiersList = (subMode && modeConfig?.subModeTiers?.[subMode]) || modeConfig?.tiers || [];
  const matchedTier = tiersList.find((t) => t.rank === calculatedRank);

  return {
    rank: calculatedRank,
    tierName: meta.name,
    badgeLabel: matchedTier ? `${meta.name} • ${cleanTierTitle(matchedTier.title)}` : meta.badgeLabel,
    percentile: matchedTier?.percentile || meta.percentile,
    colorClass: meta.iconColor,
    textColor: meta.textColor,
    badgeBg: meta.badgeBg,
    badgeBorder: meta.badgeBorder,
    desc: customDesc || matchedTier?.description || '',
  };
}

/**
 * Membersihkan prefix nama tier (Apex / Master / Diamond dll) dari judul sub-gelar kognitif
 * agar tidak terjadi duplikasi saat dirender berdampingan dengan badge nama tier.
 */
export function cleanTierTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle.replace(/^(Apex|Master|Diamond|Gold|Silver|Bronze)\s*(\/|-|•)\s*/i, '').trim();
}

/**
 * Format score display according to mode specifications
 */
export function formatModeScore(mode: ReflexMode, score: number | null | undefined, unit?: string): string {
  if (score === null || score === undefined) return 'Belum Ada';
  switch (mode) {
    case 'visual':
    case 'audio':
    case 'concentration':
    case 'switching':
    case 'temporal':
      return `${Math.round(score)} ${unit || 'ms'}`;
    case 'matrix':
      return `${score.toFixed(2)} ${unit || 's'}`;
    case 'nback':
      return `${Math.round(score)}%`;
    case 'memory':
    case 'color_memory':
    case 'tracking':
    case 'chromatic':
      return `Level ${score}`;
    case 'motor':
      return `${score} ${unit || 'Hits'}`;
    case 'digit_span':
      return `${score} ${unit || 'Digit'}`;
    case 'flanker':
      return `${Math.round(score)} ${unit || 'Poin'}`;
    default:
      return `${score} ${unit || ''}`;
  }
}
