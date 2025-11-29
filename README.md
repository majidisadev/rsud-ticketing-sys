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

2. Generate VAPID Keys untuk Push Notifications

```bash
cd backend
npm run generate-vapid
```

Copy output Public Key dan Private Key ke:

- `backend/.env` (VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY)
- `frontend/.env` (REACT_APP_VAPID_PUBLIC_KEY)

3. Setup database PostgreSQL dan buat file `.env` di folder `backend`:

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

4. Buat database PostgreSQL:

```sql
CREATE DATABASE ticketing_rsud;
```

5. Buat file `.env` di folder `frontend`:

```
HOST=0.0.0.0
WDS_SOCKET_HOST=0.0.0.0
WDS_SOCKET_PORT=3000
```

6. Build:
   Development mode:

```bash
npm run dev
```

Production build:

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
