# Assets Folder

## Logo untuk Export PDF

Untuk menampilkan logo pada kop surat PDF, letakkan file logo dengan salah satu nama berikut:

```
logo.png
logo.jpg
logo.jpeg
```

### Spesifikasi Logo:
- **Format**: PNG, JPG, atau JPEG (PNG disarankan untuk transparansi)
- **Ukuran**: Minimal 200x200 pixels (akan di-resize otomatis ke 60x60 pt di PDF)
- **Nama file**: `logo.png` (atau `logo.jpg`/`logo.jpeg`)
- **Lokasi**: `backend/assets/logo.png`

### Cara Menambahkan/Mengganti Logo:

1. Siapkan file logo dalam format PNG, JPG, atau JPEG
2. Rename file menjadi `logo.png` (atau `logo.jpg`/`logo.jpeg`)
3. Copy/replace file ke folder ini (`backend/assets/`)
4. Logo akan otomatis muncul di kop surat pada export PDF laporan

### Catatan:
- Sistem akan mencari logo dengan prioritas: `logo.png` → `logo.jpg` → `logo.jpeg`
- Jika file logo tidak ditemukan, sistem akan menampilkan placeholder "LOGO"
- Logo akan muncul di sudut kiri atas kop surat
- Logo memiliki ukuran 60x60 pt di PDF dengan auto-fit
- File `.gitkeep` digunakan untuk memastikan folder ini tetap ada di repository
