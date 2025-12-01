# Ticketing System RSUD

Sistem ticketing berbasis web menggunakan PERN Stack (PostgreSQL, Express, React, Node.js) dengan Tailwind CSS dan PWA support.

## Prerequisites

- Node.js (v16 atau lebih baru)
- PostgreSQL (v12 atau lebih baru)
- npm atau yarn

## Fitur Utama

- PWA (Progressive Web App) - Installable dan offline support
- Notifikasi real-time dengan suara
- Mobile-first design
- Role-based access control (Admin, Teknisi SIMRS, Teknisi IPSRS)
- Co-assignment untuk teknisi
- Dashboard admin dengan charts
- Export laporan (Excel/PDF)
- Activity logging

## Instalasi

1. Install semua dependencies:

```bash
npm run install:all
```

2. Generate VAPID Keys untuk Push Notifications

```bash
cd backend
npm run generate-vapid
```

Copy output Public Key dan Private Key ke:

- `backend/.env` (VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY)
- `frontend/.env` (REACT_APP_VAPID_PUBLIC_KEY)

3. Buat database PostgreSQL:

```sql
CREATE DATABASE ticketing_rsud;
```

4. Setup database PostgreSQL dan buat file `.env` di folder `backend`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_rsud
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=ticketing_rsud_secret_key_change_in_production_12345
PORT=5000
NODE_ENV=development
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@rsud.local
```

5. Buat file `.env` di folder `frontend`:

```
HOST=0.0.0.0
WDS_SOCKET_HOST=0.0.0.0
WDS_SOCKET_PORT=3000
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

6. Build:
   Development mode:

```bash
npm run dev
```

atau
Production build:

```bash
npm run build
npm start
```

## Default Admin Account

Setelah pertama kali menjalankan, default admin akan dibuat:

- Username: `admin`
- Password: `admin123`
  **PENTING**: Ganti password default setelah login pertama kali!

## Struktur Project

```
ticketing-rsud/
├── backend/          # Express API server
├── frontend/         # React PWA application
└── package.json      # Root package.json untuk menjalankan kedua server
```

## Teknologi

- **Backend**: Node.js, Express, PostgreSQL, Sequelize
- **Frontend**: React, Tailwind CSS, PWA
- **Notifications**: Web Push API
- **Charts**: Chart.js / Recharts
- **Export**: ExcelJS, PDFKit

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
