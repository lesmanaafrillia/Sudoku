# Sudoku

Game Sudoku di browser dengan tiga tingkat kesulitan: **Easy**, **Medium**, dan **Hard**. Dibuat dengan HTML, CSS, dan JavaScript murni, tanpa library atau server.

## Alur permainan

1. Halaman awal menampilkan pilihan **Easy**, **Medium**, dan **Hard**.
2. Setiap tingkat punya **10 level**. Level berikutnya terbuka setelah level sebelumnya selesai, dan setelah menang pemain langsung bisa lanjut ke level berikutnya.
3. **Medium** terbuka setelah Easy level 10 selesai, dan **Hard** terbuka setelah Medium level 10 selesai.
4. Progres dan waktu terbaik tersimpan di browser pemain, jadi tidak hilang saat halaman ditutup.

## Fitur

- Setiap level selalu punya puzzle yang sama dengan satu solusi pasti, dan makin sulit di level yang lebih tinggi
- Penanda angka salah, maksimal 3 kesalahan
- Mode catatan (pensil) untuk menulis kemungkinan angka
- Undo, hapus, dan 3 petunjuk per game
- Timer dan penghitung sisa angka
- Bisa dimainkan dengan keyboard: angka 1–9, panah untuk pindah kotak, `N` untuk catatan, `Backspace` untuk hapus, `Ctrl+Z` untuk undo
- Tampilan mengikuti mode terang/gelap perangkat, nyaman di HP

## Menjalankan di komputer

Cukup buka `index.html` di browser.

## Deploy ke GitHub Pages

1. Buka repository ini di GitHub, lalu masuk ke **Settings → Pages**.
2. Di bagian **Source**, pilih **Deploy from a branch**.
3. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
4. Tunggu 1–2 menit. Game akan tayang di `https://<username>.github.io/<nama-repo>/`.
