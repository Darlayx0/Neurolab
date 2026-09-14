import React, { useState } from 'react';
import { BestRecords, ReflexMode } from '../types';
import {
  Eye,
  Volume2,
  Brain,
  Crosshair,
  Zap,
  Binary,
  Layers,
  Grid3X3,
  ScanEye,
  Palette,
  ArrowLeftRight,
  Timer,
  Activity,
  Trophy,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { MODE_SUBMODES_MAP, getBestRecord } from '../utils/storage';
import { evaluateScoreTier } from '../utils/tierSystem';
import { CompactModuleCard } from './common/CompactModuleCard';
import { NeuroBrainVisual } from './common/NeuroBrainVisual';
import { ModeRecordModal } from './common/ModeRecordModal';
import { FullRecordsDashboard } from './records/FullRecordsDashboard';
import { playButtonPress } from '../utils/audio';

interface MainMenuProps {
  records: BestRecords;
  onSelectMode: (mode: ReflexMode) => void;
  onUpdateRecords?: () => void;
}

type FilterCategory = 'all' | 'reflex' | 'memory' | 'focus';

interface ModeDefinition {
  id: ReflexMode;
  title: string;
  category: 'reflex' | 'memory' | 'focus';
  categoryTag: string;
  categoryTagColor: string;
  shortDescription: string;
  icon: React.ReactNode;
  iconBg: string;
  accentHover: string;
  unit: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  records,
  onSelectMode,
  onUpdateRecords,
}) => {
  const [viewMode, setViewMode] = useState<'games' | 'records'>('games');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [activeRecordModal, setActiveRecordModal] = useState<{
    mode: ReflexMode;
    title: string;
    unit: string;
    subMode?: string;
  } | null>(null);

  const modes: ModeDefinition[] = [
    {
      id: 'visual',
      title: 'Reaksi Visual',
      category: 'reflex',
      categoryTag: 'VISUAL',
      categoryTagColor: 'text-rose-600 bg-rose-50 border-rose-200/80',
      shortDescription: 'Kecepatan respon visual instan',
      icon: <Eye className="w-5 h-5 text-rose-500" />,
      iconBg: 'bg-rose-50/90 border-rose-100',
      accentHover: 'hover:border-rose-300/80',
      unit: 'ms',
    },
    {
      id: 'audio',
      title: 'Reaksi Suara',
      category: 'reflex',
      categoryTag: 'AUDITORI',
      categoryTagColor: 'text-sky-600 bg-sky-50 border-sky-200/80',
      shortDescription: 'Ketajaman refleks pendengaran',
      icon: <Volume2 className="w-5 h-5 text-sky-500" />,
      iconBg: 'bg-sky-50/90 border-sky-100',
      accentHover: 'hover:border-sky-300/80',
      unit: 'ms',
    },
    {
      id: 'concentration',
      title: 'Tantangan Konsentrasi',
      category: 'focus',
      categoryTag: 'FOKUS',
      categoryTagColor: 'text-violet-600 bg-violet-50 border-violet-200/80',
      shortDescription: 'Fokus selektif efek Stroop',
      icon: <Zap className="w-5 h-5 text-violet-500" />,
      iconBg: 'bg-violet-50/90 border-violet-100',
      accentHover: 'hover:border-violet-300/80',
      unit: 'ms',
    },
    {
      id: 'motor',
      title: 'Koordinasi Motorik',
      category: 'reflex',
      categoryTag: 'MOTORIK',
      categoryTagColor: 'text-amber-600 bg-amber-50 border-amber-200/80',
      shortDescription: 'Kecepatan ketukan motorik jari',
      icon: <Crosshair className="w-5 h-5 text-amber-500" />,
      iconBg: 'bg-amber-50/90 border-amber-100',
      accentHover: 'hover:border-amber-300/80',
      unit: 'Ketukan',
    },
    {
      id: 'memory',
      title: 'Memori Spasial',
      category: 'memory',
      categoryTag: 'MEMORI',
      categoryTagColor: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      shortDescription: 'Daya ingat urutan ubin spasial',
      icon: <Brain className="w-5 h-5 text-emerald-500" />,
      iconBg: 'bg-emerald-50/90 border-emerald-100',
      accentHover: 'hover:border-emerald-300/80',
      unit: 'Level',
    },
    {
      id: 'color_memory',
      title: 'Memori Kromatik',
      category: 'memory',
      categoryTag: 'MEMORI',
      categoryTagColor: 'text-pink-600 bg-pink-50 border-pink-200/80',
      shortDescription: 'Retensi spasial warna & target selektif',
      icon: <Boxes className="w-5 h-5 text-pink-500" />,
      iconBg: 'bg-pink-50/90 border-pink-100',
      accentHover: 'hover:border-pink-300/80',
      unit: 'Level',
    },
    {
      id: 'digit_span',
      title: 'Ingatan Angka',
      category: 'memory',
      categoryTag: 'MEMORI',
      categoryTagColor: 'text-indigo-600 bg-indigo-50 border-indigo-200/80',
      shortDescription: 'Memori kerja deret angka acak',
      icon: <Binary className="w-5 h-5 text-indigo-500" />,
      iconBg: 'bg-indigo-50/90 border-indigo-100',
      accentHover: 'hover:border-indigo-300/80',
      unit: 'Digit',
    },
    {
      id: 'matrix',
      title: 'Pemindaian Angka',
      category: 'focus',
      categoryTag: 'POLA',
      categoryTagColor: 'text-orange-600 bg-orange-50 border-orange-200/80',
      shortDescription: 'Kecepatan pemindaian angka acak',
      icon: <Grid3X3 className="w-5 h-5 text-orange-500" />,
      iconBg: 'bg-orange-50/90 border-orange-100',
      accentHover: 'hover:border-orange-300/80',
      unit: 'Detik',
    },
    {
      id: 'tracking',
      title: 'Pelacakan Objek',
      category: 'focus',
      categoryTag: 'PELACAKAN',
      categoryTagColor: 'text-purple-600 bg-purple-50 border-purple-200/80',
      shortDescription: 'Pelacakan objek dinamis bergerak',
      icon: <ScanEye className="w-5 h-5 text-purple-500" />,
      iconBg: 'bg-purple-50/90 border-purple-100',
      accentHover: 'hover:border-purple-300/80',
      unit: 'Level',
    },
    {
      id: 'chromatic',
      title: 'Pembeda Warna',
      category: 'reflex',
      categoryTag: 'VISUAL',
      categoryTagColor: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200/80',
      shortDescription: 'Ketajaman persepsi nuansa warna',
      icon: <Palette className="w-5 h-5 text-fuchsia-500" />,
      iconBg: 'bg-fuchsia-50/90 border-fuchsia-100',
      accentHover: 'hover:border-fuchsia-300/80',
      unit: 'Level',
    },
    {
      id: 'nback',
      title: 'Penyelarasan Memori',
      category: 'memory',
      categoryTag: 'MEMORI',
      categoryTagColor: 'text-cyan-600 bg-cyan-50 border-cyan-200/80',
      shortDescription: 'Memori kerja dinamis N-Back',
      icon: <Layers className="w-5 h-5 text-cyan-500" />,
      iconBg: 'bg-cyan-50/90 border-cyan-100',
      accentHover: 'hover:border-cyan-300/80',
      unit: '%',
    },
    {
      id: 'switching',
      title: 'Pengalihan Pola',
      category: 'focus',
      categoryTag: 'KOGNITIF',
      categoryTagColor: 'text-teal-600 bg-teal-50 border-teal-200/80',
      shortDescription: 'Fleksibilitas peralihan pola',
      icon: <ArrowLeftRight className="w-5 h-5 text-teal-500" />,
      iconBg: 'bg-teal-50/90 border-teal-100',
      accentHover: 'hover:border-teal-300/80',
      unit: 'ms',
    },
    {
      id: 'temporal',
      title: 'Estimasi Waktu',
      category: 'focus',
      categoryTag: 'KRONOMETRI',
      categoryTagColor: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      shortDescription: 'Presisi ritme & jam internal',
      icon: <Timer className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50/90 border-emerald-100',
      accentHover: 'hover:border-emerald-300/80',
      unit: 'ms',
    },
    {
      id: 'flanker',
      title: 'Inhibisi Flanker',
      category: 'focus',
      categoryTag: 'INHIBISI',
      categoryTagColor: 'text-amber-700 bg-amber-50 border-amber-200/80',
      shortDescription: 'Resolusi konflik & filter distraksi',
      icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50/90 border-amber-100',
      accentHover: 'hover:border-amber-300/80',
      unit: 'Poin',
    },
  ];

  const filteredModes = modes.filter((m) => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  const formatScoreValue = (score: number, unit: string, mode: ReflexMode): string => {
    if (mode === 'matrix') return `${score.toFixed(2)}s`;
    if (mode === 'nback') return `${Math.round(score)}%`;
    if (mode === 'motor') return `${score} Hits`;
    if (mode === 'digit_span') return `${score} Digit`;
    if (mode === 'memory' || mode === 'color_memory' || mode === 'tracking' || mode === 'chromatic') return `LVL ${score}`;
    if (mode === 'switching' || mode === 'temporal') return `${Math.round(score)} ms`;
    if (mode === 'flanker') return `${Math.round(score)} Poin`;
    return `${score} ${unit}`;
  };

  const handleCardClick = (mode: ModeDefinition) => {
    playButtonPress();
    if (viewMode === 'records') {
      setActiveRecordModal({
        mode: mode.id,
        title: mode.title,
        unit: mode.unit,
      });
    } else {
      onSelectMode(mode.id);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between bg-slate-50 text-slate-900 select-none">
      {/* 1. Top Brand Header (Aligned with IMG_1538 Reference) */}
      <header className="w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Brand Left: Logo + Text + Sub-Tagline */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xs shadow-indigo-500/25 shrink-0">
              <Activity className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 leading-none">
                NEUROLAB
              </span>
              <span className="text-[8.5px] sm:text-[9.5px] font-bold tracking-widest text-slate-400 uppercase font-mono mt-1">
                LATIH • UKUR • KEMBANGKAN
              </span>
            </div>
          </div>

          {/* Brand Right: Functional Trophy Button (Opens/Toggles Records & Tiers) */}
          <button
            id="header-trophy-records-btn"
            type="button"
            onClick={() => {
              playButtonPress();
              setViewMode((prev) => (prev === 'games' ? 'records' : 'games'));
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-150 cursor-pointer select-none active:scale-95 shrink-0 ${
              viewMode === 'records'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25'
                : 'bg-white/90 hover:bg-amber-50 text-amber-600 hover:text-amber-700 border-slate-200/80 shadow-2xs hover:shadow-xs'
            }`}
            title={viewMode === 'records' ? 'Kembali ke Pilihan Modul' : 'Lihat Seluruh Rekor & Evaluasi Tier'}
            aria-label="Rekor & Prestasi"
          >
            <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Content Arena */}
      <main className="flex-1 max-w-6xl mx-auto px-3.5 sm:px-6 py-3 sm:py-5 w-full flex flex-col justify-start">
        {/* Sub Header: Seamless & Open Layout (Text Left, Realistic Brain Right) */}
        <section className="w-full pt-1 sm:pt-2 pb-2 sm:pb-3 mb-2 sm:mb-3 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Text Hierarchy (Left-Aligned, Clean & To The Point) */}
          <div className="flex-1 min-w-0 text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {viewMode === 'records' ? 'Papan Rekor & Evaluasi' : 'Kognitif & Refleks'}
            </h1>

            <p className="text-[11px] sm:text-xs lg:text-sm text-slate-500 leading-snug sm:leading-relaxed mt-1 line-clamp-2 max-w-sm sm:max-w-md font-normal">
              {viewMode === 'records'
                ? 'Tinjau pencapaian rekor tertinggi dan tingkatan lencana tier Anda.'
                : 'Ukur daya ingat memori, fokus konsentrasi, koordinasi motorik, dan latensi reaksi.'}
            </p>
          </div>

          {/* Right: Realistic 3D Anatomical Neuro-Brain Visual */}
          <div className="shrink-0 flex items-center justify-center">
            <NeuroBrainVisual size="md" />
          </div>
        </section>

        {viewMode === 'records' ? (
          <FullRecordsDashboard
            records={records}
            modes={modes}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            onSelectMode={onSelectMode}
            onOpenRecordModal={(modeId, title, unit, subMode) => {
              setActiveRecordModal({
                mode: modeId,
                title,
                unit,
                subMode,
              });
            }}
            onRecordsUpdated={() => {
              onUpdateRecords?.();
            }}
          />
        ) : (
          <>
            {/* 3. Quick Category Filter Tabs (Compact & To The Point) */}
            <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  Semua ({modes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('reflex')}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeCategory === 'reflex'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  Refleks (4)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('memory')}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeCategory === 'memory'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  Memori (3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('focus')}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                    activeCategory === 'focus'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                  }`}
                >
                  Fokus & Pola (4)
                </button>
              </div>

              {/* Mode Indicator Tag */}
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider hidden sm:block shrink-0">
                11 MODUL AKTIF
              </span>
            </div>

            {/* 4. Ultra-Compact Module Grid (Anti-Long-Scroll Architecture) */}
            {/* Mobile: 1-col, Tablet: 2-col, Desktop: 3-col */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {filteredModes.map((mode) => {
                const singleScore = getBestRecord(mode.id);
                const hasScore = singleScore !== null && singleScore !== undefined;
                const tierEval = hasScore ? evaluateScoreTier(mode.id, singleScore) : null;
                const formattedScore = hasScore ? formatScoreValue(singleScore, mode.unit, mode.id) : null;

                return (
                  <CompactModuleCard
                    key={mode.id}
                    id={mode.id}
                    title={mode.title}
                    categoryTag={mode.categoryTag}
                    categoryTagColor={mode.categoryTagColor}
                    shortDescription={mode.shortDescription}
                    icon={mode.icon}
                    iconBg={mode.iconBg}
                    accentHover={mode.accentHover}
                    unit={mode.unit}
                    formattedScore={formattedScore}
                    tierName={tierEval?.tierName}
                    tierRank={tierEval?.rank}
                    isRecordMode={false}
                    onClick={() => handleCardClick(mode)}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* 5. Footer: Clean & Compact */}
      <footer className="w-full border-t border-slate-200/70 py-2.5 text-center text-[11px] text-slate-400 shrink-0">
        NeuroLab • Platform Evaluasi Kognitif, Memori & Refleks Presisi Tinggi
      </footer>

      {/* Direct Record & History Inspection Modal */}
      {activeRecordModal && (
        <ModeRecordModal
          isOpen={Boolean(activeRecordModal)}
          onClose={() => setActiveRecordModal(null)}
          mode={activeRecordModal.mode}
          modeTitle={activeRecordModal.title}
          unit={activeRecordModal.unit}
          initialSubMode={activeRecordModal.subMode}
          onRecordCleared={() => {
            onUpdateRecords?.();
          }}
        />
      )}
    </div>
  );
};
