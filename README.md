# Ticketing System RSUD

Sistem ticketing berbasis web menggunakan PERN Stack (PostgreSQL, Express, React, Node.js) dengan Tailwind CSS dan PWA support.

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

2. Setup database PostgreSQL dan buat file `.env` di folder `backend`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_rsud
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=5000
```

3. Jalankan migrasi database (akan dibuat otomatis)

4. Development mode:
```bash
npm run dev
```

5. Production build:
```bash
npm run build
npm start
```

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

