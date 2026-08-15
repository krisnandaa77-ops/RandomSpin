# Panduan Penggunaan & Penjelasan Sistem - Aplikasi Spin Random

Dokumen ini berisi panduan lengkap tentang cara menggunakan aplikasi Spin Random, mulai dari halaman Admin hingga halaman eksekusi Spin, serta penjelasan teknis mengenai logika di balik sistem pengacakan.

---

## 1. Pengenalan Aplikasi

**Spin Random** adalah aplikasi berbasis web yang dirancang untuk melakukan undian *doorprize* atau pemilihan acak secara profesional, transparan, dan interaktif. Aplikasi ini memiliki dua antarmuka utama:
1. **Halaman Admin:** Digunakan oleh panitia untuk mengatur data hadiah, daftar peserta, dan pengaturan tampilan.
2. **Halaman Spin (Layar Undian):** Ditampilkan ke audiens/layar besar untuk melakukan proses pengacakan secara *live*.

Data tersimpan secara lokal (*localStorage*) dan sinkron secara *real-time* antar tab browser.

---

## 2. Panduan Penggunaan Halaman Admin

Halaman admin dapat diakses melalui rute `/admin`. Halaman ini dilindungi oleh kata sandi (default: `123456` atau sesuai pengaturan environment).

### A. Manajemen Hadiah (Prizes)
1. Buka menu **Hadiah** di panel samping.
2. Isi formulir penambahan hadiah:
   - **Sesi:** Kelompokkan hadiah berdasarkan sesi (misal: Sesi 1, Grand Prize).
   - **Nama Hadiah:** Contoh "Sepeda Motor", "TV LED 32 Inch".
   - **Kuota:** Jumlah pemenang untuk hadiah tersebut (misal: 1 atau 5 orang sekaligus).
   - **Gambar:** (Opsional) Upload gambar hadiah. Sistem akan otomatis mengompresi gambar untuk menghemat kapasitas penyimpanan memori browser.
3. Klik **Simpan Hadiah**.

### B. Manajemen Peserta (Participants)
1. Buka menu **Peserta**.
2. Anda dapat menambahkan peserta secara manual satu per satu atau menggunakan fitur **Import CSV**.
3. **Format CSV:** Harus memiliki kolom bernama `name`.
4. Jika peserta berhalangan hadir sebelum acara, Anda bisa menonaktifkan status kehadirannya menggunakan tombol *toggle* di tabel peserta.

### C. Pengaturan (Settings)
1. Buka menu **Pengaturan**.
2. **Kustomisasi Tampilan:** Anda dapat mengubah warna latar belakang, warna teks, gambar background (mendukung format gambar dan video seperti MP4), serta warna tombol.
3. **Aturan Undian:** Terdapat opsi *Allow Duplicate Winners*. Jika diaktifkan, satu peserta bisa memenangkan lebih dari satu hadiah yang berbeda.
4. Jangan lupa klik **Simpan Pengaturan**.

---

## 3. Panduan Penggunaan Halaman Spin (Layar Undian)

Halaman Spin dapat diakses melalui rute utama `/`. Halaman ini direkomendasikan untuk di-*full screen* (F11) pada layar proyektor.

1. **Memulai Undian:** 
   - Pilih Sesi dan Hadiah menggunakan navigasi panah (kiri/kanan) atau tab di bagian atas.
   - Jika ingin memberikan efek kejutan sebelum diundi, klik tombol **Intro Hadiah**.
   - Klik **Mulai Acak** untuk memulai animasi.
   
2. **Membatalkan Pemenang (Tidak Hadir / Respin):**
   - Jika setelah diundi ternyata pemenang **tidak ada di tempat**, Anda bisa mengklik kotak nama pemenang tersebut.
   - Nama tersebut akan ditandai dengan label "❌ Tidak Hadir".
   - Tombol "Mulai Acak" akan berubah menjadi **Undi Ulang (Respin)**.
   - Klik tombol tersebut untuk mengundi ulang **hanya** untuk slot yang kosong/dibatalkan, sementara pemenang yang sah akan terkunci (🔒).

---

## 4. Penjelasan Teknis: Logika Penentuan Pemenang

Sistem pengacakan pada aplikasi ini tidak berputar seperti *roulette* fisik di mana hasil ditentukan saat putaran berhenti. Aplikasi digital ini menggunakan pendekatan algoritma yang menjamin hasil acak murni, namun diproses lebih cepat di belakang layar.

### Alur Kerja (Algoritma Spin)

1. **Pemilihan (Pre-Selection):** 
   - Tepat saat tombol "Mulai Acak" diklik, sistem langsung mengumpulkan daftar semua peserta yang memenuhi syarat (hadir dan belum pernah menang, atau sesuai aturan duplikasi).
   - Daftar ini langsung diacak (*shuffle*) menggunakan algoritma berbasis `Math.random()`.
   - Sistem mengambil nama-nama di urutan paling atas sesuai dengan jumlah kuota hadiah yang sedang diundi.
   - Pemenang ini disimpan ke dalam memori rahasia sementara (`finalWinnersRef`).

2. **Animasi Visual (Tipuan Ketegangan):**
   - Untuk memberikan efek *suspense* (ketegangan) kepada audiens, layar akan menampilkan nama-nama peserta yang berganti dengan sangat cepat setiap 50 milidetik.
   - Nama-nama yang berputar ini *bukan* merupakan proses pemilihan, melainkan murni kosmetik/animasi visual yang menyesuaikan durasi pengaturan (misalnya 5 detik).

3. **Penetapan dan Penyimpanan (Final Stop):**
   - Ketika cincin progres (lingkaran kuning) mencapai 100%, animasi rotasi dihentikan paksa.
   - Layar langsung menampilkan daftar "Pemenang Rahasia" yang telah disiapkan di langkah pertama.
   - Data ini kemudian diberi stempel waktu (*timestamp*) dan ID unik, lalu disimpan secara permanen ke *localStorage*.
   - Karena adanya integrasi sinkronisasi memori (storage event listener), penambahan data pemenang ini akan seketika muncul di tabel "Pemenang" pada tab halaman Admin.

---
*Dokumen ini dibuat secara otomatis sebagai panduan referensi.*
