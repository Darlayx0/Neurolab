# Neurolab - Reflex Trainer ⚡🧠

Platform pelatihan dan evaluasi refleks visual, audio, memori kognitif, pelacakan spasial, diskriminasi warna, fleksibilitas pengalihan pola, estimasi waktu biologis, dan kontrol inhibisi flanker berpresisi tinggi.

---

## 🚀 Live Demo / Kunjungi Web
Aplikasi ini diotomatisasi untuk deployment langsung menggunakan **GitHub Pages**:
- **URL**: [https://darlayx0.github.io/Neurolab/](https://darlayx0.github.io/Neurolab/)

---

## ⚙️ Otomasi Deployment (CI/CD)

Proyek ini telah dilengkapi dengan workflow otomasi GitHub Actions di `.github/workflows/deploy.yml`.

### Cara Mengaktifkan GitHub Pages (Sekali Saja di Repository GitHub):
1. Buka repositori Anda di GitHub: [https://github.com/Darlayx0/Neurolab](https://github.com/Darlayx0/Neurolab)
2. Masuk ke tab **Settings** > **Pages** (di menu kiri).
3. Pada bagian **Build and deployment** > **Source**, pilih **GitHub Actions**.
4. Selesai! Setiap kali Anda melakukan `git push` ke branch `main`, GitHub Actions akan otomatis membangun (build) dan mempublikasikan versi terbaru ke `https://darlayx0.github.io/Neurolab/`.

### Opsi Deployment Lain:
- **Vercel**: Import repository `Darlayx0/Neurolab` di dashboard Vercel. Konfigurasi `vercel.json` telah disediakan sehingga otomatis berjalan tanpa konfigurasi tambahan.
- **Netlify**: Hubungkan repository di Netlify. Konfigurasi `netlify.toml` telah tersedia.

---

## 💻 Pengembangan Lokal (Local Development)

1. **Clone repository**:
   ```bash
   git clone https://github.com/Darlayx0/Neurolab.git
   cd Neurolab
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Jalankan server dev**:
   ```bash
   npm run dev
   ```

4. **Build untuk produksi**:
   ```bash
   npm run build
   ```

5. **Preview hasil build**:
   ```bash
   npm run preview
   ```

---

## 🧩 Modul & Fitur
- **Visual Reaction**: Uji kecepatan respons visual terhadap stimulus lampu/warna.
- **Audio Reaction**: Uji latensi auditori terhadap respons suara frekuensi tinggi.
- **Memory & Spatial**: Matriks memori spasial dan digit span.
- **Motor Coordination**: Koordinasi motorik dan pelacakan target dinamis.
- **Cognitive Flexibility & Inhibition**: Flanker task, Stroop/Switching test, dan evaluasi temporal.
- **Sistem Tier & Pencatatan Rekor**: Pelacakan rekor pribadi secara offline/lokal dengan sistem peringkat neuromuskular.
