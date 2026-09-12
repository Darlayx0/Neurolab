import React, { useState, useEffect } from 'react';
import { ReflexMode, TierRank } from '../../types';
import {
  X,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Target,
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
  ShieldAlert,
  Sparkles,
  Info,
  Crown,
} from 'lucide-react';
import {
  ALL_MODE_TIER_STANDARDS,
  TIER_METADATA,
  ModeTierThreshold,
  cleanTierTitle,
} from '../../utils/tierSystem';
import { TierIcon } from './TierBadge';
import { AppButton } from './AppButton';

export interface ModeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ReflexMode;
  initialTab?: 'guide' | 'standards';
  initialSubMode?: string;
}

interface GuideContent {
  scientificBasis: string;
  howToPlay: string[];
  penaltyRule: string;
  optimalTips: string[];
}

const MODE_GUIDES: Record<ReflexMode, GuideContent> = {
  visual: {
    scientificBasis:
      'Menguji jalur refleks visual monosinaptik dan transmisi akson dari retina menuju korteks visual (V1) lalu ke korteks motorik. Nilai median manusia sehat berkisar antara 220–280 milidetik.',
    howToPlay: [
      'Pilih tombol "MULAI 5 RONDE" untuk memulai sesi.',
      'Layar akan berada dalam status menunggu dengan warna netral selama jeda acak 3 hingga 8 detik.',
      'Segera setelah seluruh layar berubah warna menjadi HIJAU, ketuk atau klik layar secepat mungkin.',
      'Sesi terdiri dari 5 ronde penuh. Skor akhir adalah rerata waktu reaksi dari 5 ronde.',
    ],
    penaltyRule:
      'Penalti False Start: Menyentuh layar sebelum warna hijau muncul akan membatalkan ronde tersebut dan menambahkan penalti waktu +1.000 ms ke rerata ronde.',
    optimalTips: [
      'Gunakan jari telunjuk yang rileks dan posisikan tepat 1–2 mm di atas permukaan layar.',
      'Fokuskan pandangan pada area tengah layar tanpa mengedipkan mata saat memasuki detik ke-3.',
      'Hindari menebak atau mengantisipasi waktu munculnya warna hijau.',
    ],
  },
  audio: {
    scientificBasis:
      'Jalur pendengaran manusia memproses rangsangan lebih cepat daripada penglihatan karena impuls suara hanya membutuhkan 8–10 milidetik untuk mencapai korteks pendengaran, dibandingkan 20–40 milidetik pada retina mata.',
    howToPlay: [
      'Pilih frekuensi nada yang nyaman bagi telinga Anda (440 Hz, 880 Hz, atau 1760 Hz).',
      'Saat pengujian dimulai, layar akan berubah menjadi GELAP TOTAL.',
      'Dengarkan dengan saksama selama jeda acak 3 hingga 8 detik.',
      'Begitu Anda mendengar nada suara beep, ketuk layar secepat kilat.',
      'Sesi berlangsung selama 5 ronde dan menghasilkan skor rerata latensi.',
    ],
    penaltyRule:
      'Penalti Prematur: Mengetuk layar sebelum nada suara terdengar akan memicu status pelanggaran dan menambahkan penalti waktu +1.000 ms.',
    optimalTips: [
      'Disarankan menggunakan earphone atau headphone untuk latensi suara minimal dan fokus akustik maksimal.',
      'Pastikan volume perangkat berada pada tingkat yang jelas namun aman bagi pendengaran.',
    ],
  },
  memory: {
    scientificBasis:
      'Menguji daya tampung visuospatial sketchpad pada memori kerja (working memory) dan korteks prefrontal dorsal-lateral dalam memetakan posisi objek spasial secara simultan.',
    howToPlay: [
      'Pada grid 4x4, sejumlah ubin angka akan muncul secara terbuka selama 1,8 detik.',
      'Hafalkan posisi angka-angka tersebut sebelum ubin tertutup kembali.',
      'Ketuk ubin secara berurutan mulai dari angka 1 hingga angka tertinggi yang tadi terlihat.',
      'Setiap penyelesaian yang berhasil akan menaikkan level kesulitan (jumlah angka yang harus diingat bertambah).',
    ],
    penaltyRule:
      'Penalti Salah Urutan: Mengetuk ubin yang salah akan langsung mengakhiri sesi pengujian pada level capaian saat itu.',
    optimalTips: [
      'Hubungkan letak angka menjadi bentuk pola geometris (seperti garis diagonal, segitiga, atau huruf) di dalam benak Anda.',
      'Lafalkan angka terkecil hingga terbesar dalam urutan arah spasial (misal: kiri-atas ke kanan-bawah).',
    ],
  },
  motor: {
    scientificBasis:
      'Menguji kecepatan koordinasi mata-tangan (eye-hand coordination), kontrol motorik halus (fine motor control), dan stabilitas neuromuskular di bawah tekanan batasan waktu.',
    howToPlay: [
      'Target bullseye lingkaran akan muncul secara acak di berbagai koordinat papan arena.',
      'Ketuk target sasaran secepat dan setepat mungkin sebelum target berpindah.',
      'Tantangan berlangsung selama 60 detik tanpa henti.',
      'Skor akhir dihitung dari akumulasi ketukan bersih yang berhasil mengenai target.',
    ],
    penaltyRule:
      'Penalti Meleset: Mengetuk area kosong di luar target bullseye akan mengurangi skor sebanyak -5 Hits per kesalahan klik.',
    optimalTips: [
      'Pertahankan ritme konsisten daripada memaksakan gerakan tergesa-gesa yang berisiko meleset.',
      'Pastikan posisi duduk atau genggaman ponsel stabil dengan jari dominan bergerak leluasa.',
    ],
  },
  concentration: {
    scientificBasis:
      'Menguji fokus selektif dan kemampuan inhibisi perilaku (response inhibition) korteks prefrontal. Otak dilatih untuk menahan dorongan impulsif saat stimulus pengecoh muncul.',
    howToPlay: [
      'Stimulus lingkaran akan muncul secara berkala di layar.',
      'Jika lingkaran berwarna HIJAU (Go Target), ketuk layar sesegera mungkin.',
      'Jika lingkaran berwarna MERAH (No-Go Trap), TAHAN jari Anda dan JANGAN menyentuh layar.',
      'Sesi berlangsung selama 10 ronde stimulus acak.',
    ],
    penaltyRule:
      'Penalti Jebakan: Mengetuk saat stimulus berwarna MERAH merupakan kegagalan inhibisi dan akan memberikan penalti waktu drastis pada ronde tersebut.',
    optimalTips: [
      'Tahan jari dalam posisi siap, namun biasakan mata mengonfirmasi spektrum warna sebelum melepas impuls motorik.',
      'Bernapas teratur untuk menjaga kestabilan sistem saraf otonom.',
    ],
  },
  digit_span: {
    scientificBasis:
      'Berdasarkan pengujian standar psikometri Wechsler Memory Scale. Menguji phonological loop dalam memproses dan mereproduksi kode informasi verbal dalam urutan sekuensial.',
    howToPlay: [
      'Angka akan ditampilkan satu per satu di layar dengan interval 1 detik.',
      'Setelah deret angka selesai ditampilkan, masukkan kembali deret angka tersebut dengan urutan yang sama persis.',
      'Setiap jawaban benar akan meningkatkan panjang deretan angka sebesar +1 digit di ronde berikutnya.',
    ],
    penaltyRule:
      'Penalti Kesalahan: Memasukkan angka yang salah atau urutan yang keliru akan mengakhiri tes. Rentang digit tertinggi yang sukses menjadi skor akhir Anda.',
    optimalTips: [
      'Kelompokkan angka menjadi segmen ritmis 2 atau 3 angka (metode chunking, misal: 4-8-1 menjadi 481).',
      'Ucapkan deret angka secara subvokal (di dalam hati) dengan irama berulang.',
    ],
  },
  nback: {
    scientificBasis:
      'Tolok ukur utama neurosains untuk mengukur fluid intelligence dan kapasitas working memory updating. Menuntut otak secara simultan membuang memori usang dan menyimpan stimulus baru.',
    howToPlay: [
      'Huruf alfabet akan muncul bergantian satu per satu di layar.',
      'Tugas Anda adalah menentukan apakah huruf yang sedang tampil SAMA dengan huruf yang muncul N langkah sebelumnya.',
      'Pada level 2-Back: cocokkan dengan huruf 2 langkah sebelumnya.',
      'Tekan tombol "COCOK" jika huruf sama, atau biarkan jika huruf berbeda.',
    ],
    penaltyRule:
      'Penalti False Match: Menekan tombol cocok pada huruf yang tidak sesuai akan dihitung sebagai error akurasi yang menurunkan skor persentase akhir.',
    optimalTips: [
      'Pertahankan jendela geser (sliding window) berisi 2 huruf terakhir di benak Anda secara aktif.',
      'Fokuskan perhatian penuh tanpa memikirkan huruf yang telah lewat dari rentang N.',
    ],
  },
  matrix: {
    scientificBasis:
      'Berdasarkan metodologi Tabel Schulte yang digunakan dalam pelatihan astronaut dan pilot tempur. Mengembangkan efisiensi penglihatan periferal dan kecepatan membaca sekuensial.',
    howToPlay: [
      'Pilih ukuran grid yang diinginkan: Grid 4x4 (16 angka), Grid 5x5 (25 angka), atau Grid 6x6 (36 angka).',
      'Papan berisi angka-angka acak akan ditampilkan bersamaan dengan stopwatch.',
      'Cari dan tekan angka berurutan mulai dari 1 sampai angka tertinggi (1, 2, 3, ... N).',
      'Waktu berhenti saat angka terakhir berhasil ditekan.',
    ],
    penaltyRule:
      'Penalti Salah Urutan: Menekan angka yang bukan giliran target sekuensial berikutnya akan langsung menambahkan penalti +5,0 detik ke catatan waktu Anda.',
    optimalTips: [
      'Posisikan titik fokus pandangan mata di tengah papan petak, lalu gunakan penglihatan samping (visi periferal) untuk melacak angka-angka berikutnya.',
      'Hindari memindahkan pandangan mata secara tergesa-gesa ke setiap sudut ubin.',
    ],
  },
  tracking: {
    scientificBasis:
      'Metodologi Multiple Object Tracking (MOT) karya Dr. Zenon Pylyshyn (1988) menguji batas arsitektur visual pre-atentif otak (konektivitas parietal-frontal) dalam memetakan beberapa target bergerak secara serentak tanpa foveasi tunggal.',
    howToPlay: [
      'Pada awal setiap level, bola target akan disorot dengan lingkaran aksen oranye menyala selama 1,8 detik. Ingat bola-bola target ini.',
      'Semua bola akan menyamarkan warnanya menjadi seragam dan mulai bergerak memantul bebas di dalam arena selama beberapa detik.',
      'Begitu bola berhenti, klik atau sentuh bola-bola yang tadi menjadi target sesuai kuota level.',
      'Jika seluruh pilihan Anda benar 100%, Anda langsung melangkah ke level berikutnya dengan tantangan yang bertambah bertahap.',
    ],
    penaltyRule:
      'Aturan Sudden Death: 1 kesalahan pemilihan target (bahkan meleset hanya 1 bola) akan langsung mengakhiri sesi permainan (Game Over) tanpa sistem nyawa.',
    optimalTips: [
      'Lebarkan fokus visual Anda ke seluruh kanvas secara menyeluruh (soft focus), hindari menatap tajam hanya ke satu bola saja.',
      'Bayangkan poligon imajiner yang menghubungkan titik-titik bola target untuk mempermudah pelacakan pergerakan spasial.',
    ],
  },
  chromatic: {
    scientificBasis:
      'Menguji ambang batas Just Noticeable Difference (JND) dan diferensiasi fotoreseptor sel kerucut fovea sentralis dalam membedakan deviasi luminansi mikro pada spektrum HSL dengan ketelitian murni.',
    howToPlay: [
      'Bidang permainan terdiri dari kisi 5x5 (25 ubin) dengan warna yang identik, kecuali tepat 1 ubin anomali yang warnanya sedikit berbeda.',
      'Temukan dan ketuk ubin anomali tersebut.',
      'Setiap tebakan benar akan menaikkan level dan menyusutkan selisih kontras warna agar semakin samar.',
      'Sesi tidak dibatasi waktu, amati matriks dengan tenang dan teliti.',
    ],
    penaltyRule:
      'Aturan 1 Nyawa (Sudden Death): Anda hanya memiliki 1 nyawa. Salah memilih ubin 1 kali akan langsung mengakhiri permainan (Game Over).',
    optimalTips: [
      'Pindai kisi secara menyeluruh menggunakan pandangan rileks (soft focus), bukan meneliti ubin satu per satu.',
      'Ubin anomali bisa bernilai sedikit lebih terang ATAU sedikit lebih gelap dari warna dasar 24 ubin lainnya.',
      'Manfaatkan ketiadaan batasan waktu untuk memverifikasi pilihan Anda sebelum mengetuk.',
    ],
  },
  switching: {
    scientificBasis:
      'Cued Task-Switching Paradigm (Rogers & Monsell, 1995; Meiran, 1996) menguji fleksibilitas kognitif dorsolateral prefrontal cortex (DLPFC) dan anterior cingulate cortex (ACC) dalam mengonfigurasi ulang aturan logika aktif saat berpindah konteks seketika.',
    howToPlay: [
      'Perhatikan warna bingkai stimulus sebelum membaca angka.',
      'Bingkai Emerald (Hijau): Terapkan aturan Paritas. Pilih "Ganjil" (1,3,7,9) atau "Genap" (2,4,6,8).',
      'Bingkai Indigo (Ungu): Terapkan aturan Besaran. Pilih "Kecil" (< 5) atau "Besar" (> 5).',
      'Selesaikan 30 ronde secepat dan seakurat mungkin. Gunakan tombol keyboard (Panah Kiri/Kanan atau A/D) pada PC atau tombol sentuh pada layar ponsel.',
    ],
    penaltyRule:
      'Penalti Akurasi: Setiap kesalahan menekan atau keterlambatan respon akan menambahkan penalti +150 ms langsung ke skor akhir Switch Cost efektif Anda.',
    optimalTips: [
      'Fokuskan pandangan pertama kali pada warna bingkai untuk mengaktifkan pola pikir logika yang benar sebelum memproses angka.',
      'Gunakan dua jari tangan terpisah pada keyboard untuk mengurangi latensi transmisi motorik.',
      'Pertahankan ritme konsisten tanpa tergesa-gesa berspekulasi menebak jawaban.',
    ],
  },
  temporal: {
    scientificBasis:
      'Persepsi waktu dan kronometri internal (Treisman, 1963; Gibbon, 1977) dimediasi oleh sirkuit dopaminergik ganglia basalis, serebelum, dan supplementary motor area (SMA). Otak mengukur interval waktu melalui osilasi neural tanpa bantuan stimulus visual eksternal.',
    howToPlay: [
      'Perhatikan target durasi yang ditentukan untuk tiap ronde (contoh: 2.00s, 3.00s, 5.00s, 7.00s, atau 4.00s).',
      'Tekan dan tahan tombol utama (atau Spacebar pada PC) untuk memulai interval waktu.',
      'Saat tombol ditekan, seluruh angka penunjuk waktu disembunyikan (Blind Timing).',
      'Lepaskan tombol saat Anda memperkirakan target durasi telah tercapai seakurat mungkin.',
      'Sesi berlangsung selama 5 ronde. Skor akhir dihitung dari rerata deviasi absolut milidetik (MAD).',
    ],
    penaltyRule:
      'Penalti Pelepasan Dini: Melepas tombol secara instan (< 200 ms) sebelum durasi wajar akan dianggap sebagai pembatalan atau penalti ketidaksiapan.',
    optimalTips: [
      'Bangun metronom batin melalui ritme tarikan napas atau ketukan mikro di dalam benak.',
      'Hindari kecenderungan terburu-buru yang dipicu oleh kecemasan menahan tombol.',
      'Pertahankan ketenangan mental yang stabil sepanjang 5 variasi target interval.',
    ],
  },
  flanker: {
    scientificBasis:
      'Paradigma Eriksen Flanker Task 4-Arah menguji kontrol inhibisi kognitif anterior cingulate cortex (ACC) dan dorsolateral prefrontal cortex (DLPFC). Sistem menguji kemampuan menyaring 4 kartu distraktor dominan berpanah putih tebal yang bergetar agresif, di bawah tekanan durasi waktu yang menyusut progresif dari 1.500 ms hingga 550 ms.',
    howToPlay: [
      'Fokuskan tatapan foveal HANYA pada KARTU TENGAH (posisi ke-3 dari 5 kartu berseri).',
      'Abaikan 4 kartu pengapit samping yang memiliki panah putih tebal dan bergetar untuk mengecoh orientasi spasial Anda.',
      'Perhatikan bilah waktu durasi di atas yang menyusut dari ujung kanan ke ujung kiri; tempo durasi waktu semakin cepat seiring bertambahnya nomor trial (1.500 ms ➔ 550 ms).',
      'Jika panah target tengah HIJAU (Direct): Tekan arah yang SAMA persis (↑ Atas, ↓ Bawah, ← Kiri, → Kanan).',
      'Jika panah target tengah MERAH (Inverse): Tekan arah polar BERLAWANAN 180° (↑ lawan ↓, ↓ lawan ↑, ← lawan →, → lawan ←).',
      'Kontrol: Gunakan Cross D-Pad pada layar sentuh atau tombol keyboard (Panah ↑↓←→ atau W/S/A/D).',
    ],
    penaltyRule:
      'Sistem Skor Profesional (0 - 1.000 Poin): Skor dihitung dari Poin Akurasi (Maks 500), Bonus Kecepatan (Maks 350), dan Bonus Streak Runtutan (Maks 150). Setiap kesalahan arah atau kehabisan waktu memotong -15 Poin.',
    optimalTips: [
      'Kunci tatapan pada tanda plus (+) di reticle tengah sebelum stimulus muncul agar mata tidak melirik ke samping.',
      'Latih disiplin inhibisi: abaikan panah putih dominan di sekeliling kartu dan hanya baca warna serta arah panah tengah.',
      'Bersiaplah menghadapi peningkatan tempo di 10 trial terakhir di mana bilah waktu menyusut sangat cepat.',
    ],
  },
  chimp: {
    scientificBasis:
      'Terinspirasi dari eksperimen memori fotografis terkenal di Kyoto University oleh Prof. Tetsuro Matsuzawa dengan simpanse Ayumu (2007). Menguji kapasitas persepsi visual instan (eidetic working memory) di mana informasi spasial dipetakan dalam pecahan detik sebelum disaring oleh korteks prefrontal verbal.',
    howToPlay: [
      'Angka 1 sampai N akan muncul tersebar secara acak di papan petak spasial.',
      'Amati dan rekam posisi seluruh angka dalam benak Anda. Angka akan tetap terlihat selama Anda belum menekan apa pun.',
      'Segera setelah Anda menekan angka "1", SELURUH angka lain langsung tertutup menjadi ubin polos.',
      'Ketuk sisa ubin yang tertutup tersebut sesuai urutan dari yang terkecil ke terbesar (2, 3, 4, ... N).',
      'Setiap kali Anda berhasil menyelesaikan satu level, jumlah angka akan bertambah (+1) untuk meningkatkan tantangan spasial.',
    ],
    penaltyRule:
      'Aturan 3 Nyawa (Strikes): Anda memiliki 3 kesempatan nyawa. Mengetuk ubin yang salah akan mengurangi 1 nyawa dan memperlihatkan letak angka yang sebenarnya sejenak. Permainan berakhir saat 3 nyawa habis.',
    optimalTips: [
      'Jangan terburu-buru menyentuh angka 1; gunakan 1-2 detik untuk mengambil snapshot mental pola geometris angka.',
      'Kelompokkan angka menjadi bentuk pola geometris (misal: segitiga, garis melengkung, atau kluster terdekat).',
      'Jaga ritme ketukan jari tetap santai dan percaya pada memori fotografis pertama Anda.',
    ],
  },
};

const MODE_ICON_MAP: Record<ReflexMode, React.ReactNode> = {
  visual: <Eye className="w-5 h-5 text-rose-500" />,
  audio: <Volume2 className="w-5 h-5 text-sky-500" />,
  memory: <Brain className="w-5 h-5 text-emerald-500" />,
  motor: <Crosshair className="w-5 h-5 text-amber-500" />,
  concentration: <Zap className="w-5 h-5 text-violet-500" />,
  digit_span: <Binary className="w-5 h-5 text-indigo-500" />,
  nback: <Layers className="w-5 h-5 text-cyan-600" />,
  matrix: <Grid3X3 className="w-5 h-5 text-amber-600" />,
  tracking: <ScanEye className="w-5 h-5 text-violet-600" />,
  chromatic: <Palette className="w-5 h-5 text-fuchsia-600" />,
  switching: <ArrowLeftRight className="w-5 h-5 text-teal-600" />,
  temporal: <Timer className="w-5 h-5 text-emerald-600" />,
  flanker: <ShieldAlert className="w-5 h-5 text-amber-600" />,
  chimp: <Sparkles className="w-5 h-5 text-amber-500" />,
};

export const ModeInfoModal: React.FC<ModeInfoModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialTab = 'guide',
  initialSubMode,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'standards'>(initialTab);

  const modeConfig = ALL_MODE_TIER_STANDARDS[mode] || ALL_MODE_TIER_STANDARDS.visual;
  const guide = MODE_GUIDES[mode];
  const hasSubModes = Boolean(modeConfig.subModeTabs && modeConfig.subModeTabs.length > 0);

  const [activeSubMode, setActiveSubMode] = useState<string>(
    initialSubMode || (hasSubModes ? modeConfig.subModeTabs![0].id : '')
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialSubMode) {
        setActiveSubMode(initialSubMode);
      } else if (hasSubModes && modeConfig.subModeTabs) {
        setActiveSubMode(modeConfig.subModeTabs[0].id);
      }
    }
  }, [isOpen, initialTab, initialSubMode, hasSubModes, modeConfig]);

  if (!isOpen) return null;

  const tiersToDisplay: ModeTierThreshold[] =
    hasSubModes && activeSubMode && modeConfig.subModeTiers?.[activeSubMode]
      ? modeConfig.subModeTiers[activeSubMode]
      : modeConfig.tiers;

  const currentSubModeObj = modeConfig.subModeTabs?.find((s) => s.id === activeSubMode);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150 select-none text-slate-900"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header: Short title, strictly NO caption */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
              {MODE_ICON_MAP[mode] || <Sparkles className="w-5 h-5 text-indigo-500" />}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              Panduan & Standar
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Panduan vs Standar Tier */}
        <div className="px-5 pt-3 pb-2 shrink-0 bg-slate-50/80 border-b border-slate-100">
          <div className="p-1 rounded-2xl bg-slate-200/80 border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Panduan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('standards')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'standards'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Standar Tier</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs leading-relaxed text-slate-700">
          {/* ========================================================================= */}
          {/* TAB 1: PANDUAN */}
          {/* ========================================================================= */}
          {activeTab === 'guide' && guide && (
            <div className="space-y-3.5">
              {/* Cara Kerja & Langkah */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>Cara Kerja & Langkah Pengujian:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600">
                  {guide.howToPlay.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Aturan Penalti & Eliminasi */}
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950">
                <div className="flex items-center gap-2 text-rose-700 font-bold mb-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Aturan Eliminasi & Penalti:</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {guide.penaltyRule}
                </p>
              </div>

              {/* Tips Kinerja Maksimal */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Tips Mencapai Tier Tertinggi:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-amber-900/90 text-xs">
                  {guide.optimalTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Dasar Neurosains */}
              <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Landasan Fisiologis & Sains Kognitif:</span>
                </div>
                <p className="leading-normal">{guide.scientificBasis}</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: STANDAR TIER */}
          {/* ========================================================================= */}
          {activeTab === 'standards' && (
            <div className="space-y-3">
              {/* Submode Segmented Controls (if applicable) */}
              {hasSubModes && modeConfig.subModeTabs && (
                <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1 overflow-x-auto">
                  {modeConfig.subModeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSubMode(tab.id)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
                        activeSubMode === tab.id
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Overview Bar */}
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-semibold truncate">
                  Metrik: <span className="font-mono text-slate-900">{modeConfig.metricLabel} ({modeConfig.unit})</span>
                  {currentSubModeObj ? ` • ${currentSubModeObj.label}` : ''}
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {modeConfig.isLowerBetter ? 'Semakin kecil semakin baik' : 'Semakin besar semakin baik'}
                </span>
              </div>

              {/* 6 Tier Cards */}
              <div className="space-y-2">
                {tiersToDisplay.map((tier) => {
                  const meta = TIER_METADATA[tier.rank];
                  const isApex = tier.rank === 1;

                  return (
                    <div
                      key={tier.rank}
                      className={`p-3 rounded-2xl border transition-all shadow-xs flex flex-col gap-1.5 ${
                        isApex
                          ? 'border-amber-300/90 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 ring-1 ring-amber-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${
                              isApex
                                ? 'bg-slate-950 border-amber-400/70 text-amber-400 shadow-xs shadow-amber-500/20'
                                : `${meta.badgeBg} ${meta.badgeBorder} ${meta.iconColor}`
                            }`}
                          >
                            {isApex ? (
                              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ) : (
                              <TierIcon rank={tier.rank} className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isApex ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 text-[10px] font-black tracking-wide uppercase border border-amber-400/60 shadow-xs">
                                  Apex
                                </span>
                              ) : (
                                <span className={`text-xs font-black tracking-tight ${meta.textColor}`}>
                                  {meta.name}
                                </span>
                              )}
                              <span className="text-slate-300 font-normal">•</span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {cleanTierTitle(tier.title)}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isApex ? 'text-amber-800' : 'text-slate-400'
                              }`}
                            >
                              {tier.percentile}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border tracking-tight ${
                              isApex
                                ? 'bg-slate-950 text-amber-300 border-amber-400/60 shadow-xs'
                                : 'bg-slate-100 border-slate-200 text-slate-900'
                            }`}
                          >
                            {tier.range}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed pl-9">
                        {tier.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end shrink-0">
          <AppButton
            id="close-mode-info-modal-btn"
            label="Tutup"
            variant="primary"
            onClick={onClose}
            className="text-xs px-5 py-2 min-h-[38px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
          />
        </div>
      </div>
    </div>
  );
};
