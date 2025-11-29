# Setup Guide - Ticketing System RSUD

## Prerequisites

- Node.js (v16 atau lebih baru)
- PostgreSQL (v12 atau lebih baru)
- npm atau yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Setup Database

1. Buat database PostgreSQL:
```sql
CREATE DATABASE ticketing_rsud;
```

2. Copy file `.env.example` ke `.env` di folder `backend`:
```bash
cp backend/.env.example backend/.env
```

3. Edit `backend/.env` dan isi dengan konfigurasi database Anda:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_rsud
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=5000
NODE_ENV=development
```

### 3. Generate VAPID Keys untuk Push Notifications

```bash
cd backend
npm run generate-vapid
```

Copy output Public Key dan Private Key ke:
- `backend/.env` (VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY)
- `frontend/.env` (REACT_APP_VAPID_PUBLIC_KEY)

### 4. Setup Frontend Environment

1. Copy file `.env.example` ke `.env` di folder `frontend`:
```bash
cp frontend/.env.example frontend/.env
```

2. Edit `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

### 5. Run Development Server

```bash
npm run dev
```

Ini akan menjalankan:
- Backend di http://localhost:5000
- Frontend di http://localhost:3000

### 6. Default Admin Account

Setelah pertama kali menjalankan, default admin akan dibuat:
- Username: `admin`
- Password: `admin123`

**PENTING**: Ganti password default setelah login pertama kali!

## Production Build

### Build untuk Production

```bash
npm run build
```

### Run Production

```bash
npm start
```

## Features

### Admin
- Dashboard dengan charts (pie, line, bar)
- Manajemen user
- Monitoring semua tiket
- Export laporan (Excel/PDF)
- Soft delete tiket

### Teknisi SIMRS/IPSRS
- Tugas Saya (assigned + co-assigned)
- Semua Tugas dengan filter dan pagination
- Ambil tiket manual
- Update status dan prioritas
- Tambah tindakan perbaikan
- Upload bukti perbaikan
- Co-assignment ke teknisi lain

### Staff RS (Public)
- Form pelaporan masalah
- Tracking tiket dengan nomor tiket

## PWA Features

- Installable di device
- Offline support
- Push notifications dengan suara
- Mobile-first design

## Notifications

Notifikasi akan muncul dan berbunyi ketika:
- Tiket baru sesuai kategori teknisi
- Co-assignment dari teknisi lain
- Self-assign tidak mengirim notifikasi ke teknisi lain

## File Upload

- Maksimal ukuran file: 25MB
- Format yang didukung: Image files
- File disimpan di `backend/uploads/`

## Security

- JWT authentication
- Password hashing dengan bcrypt
- Role-based access control
- Activity logging
- Input validation

## Troubleshooting

### Database connection error
- Pastikan PostgreSQL running
- Check credentials di `.env`
- Pastikan database sudah dibuat

### Port already in use
- Ubah PORT di `backend/.env`
- Ubah port frontend di `frontend/package.json` script start

### Notifications tidak muncul
- Pastikan VAPID keys sudah di-set
- Check browser permission untuk notifications
- Pastikan service worker terdaftar (check browser console)

### Build error
- Pastikan semua dependencies terinstall
- Check Node.js version (minimal v16)
- Clear cache: `npm cache clean --force`

