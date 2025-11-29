# Ticketing System RSUD - Project Summary

## Overview
Sistem ticketing berbasis web menggunakan PERN Stack (PostgreSQL, Express, React, Node.js) dengan Tailwind CSS dan PWA support. Sistem ini dirancang untuk mobile-first dengan kemampuan installable dan notifikasi real-time.

## Tech Stack

### Backend
- **Node.js** dengan Express.js
- **PostgreSQL** dengan Sequelize ORM
- **JWT** untuk authentication
- **Web Push API** untuk notifications
- **Multer** untuk file upload
- **ExcelJS & PDFKit** untuk export laporan
- **bcryptjs** untuk password hashing

### Frontend
- **React 18** dengan React Router
- **Tailwind CSS** untuk styling
- **Recharts** untuk charts
- **Axios** untuk API calls
- **Workbox** untuk PWA dan service worker
- **Web Push API** untuk notifications

## Fitur Utama

### 1. Role-Based Access Control
- **Admin**: Manajemen user, monitoring semua tiket, dashboard dengan charts, export laporan
- **Teknisi SIMRS**: Hanya bisa handle tiket kategori SIMRS
- **Teknisi IPSRS**: Hanya bisa handle tiket kategori IPSRS
- **Staff RS (Public)**: Pelaporan tanpa login, tracking tiket

### 2. Ticket Management
- Manual ticket assignment oleh teknisi
- Co-assignment untuk minta bantuan
- Status tracking: Baru → Diproses → Selesai/Batal
- Prioritas: tinggi/sedang/rendah
- Tindakan perbaikan dengan kategori (in-progress/waiting/confirmed)
- Upload foto masalah dan bukti perbaikan (max 25MB)

### 3. Notifications
- Push notifications dengan suara
- Notifikasi muncul saat:
  - Tiket baru sesuai kategori teknisi
  - Co-assignment dari teknisi lain
- Self-assign tidak mengirim notifikasi

### 4. Dashboard Admin
- Statistik jumlah tiket per status
- Pie chart: Masalah SIMRS vs IPSRS hari ini
- Line chart: Jumlah masalah per tanggal (bulan ini)
- Bar chart: Jumlah masalah per bulan (12 bulan terakhir)

### 5. Reporting
- Export ke Excel
- Export ke PDF
- Filter berdasarkan kategori, status, prioritas, tanggal

### 6. PWA Features
- Installable di device
- Offline support
- Service worker untuk caching
- Native app-like experience

## Struktur Project

```
ticketing-rsud/
├── backend/
│   ├── config/          # Database configuration
│   ├── db/              # Database initialization
│   ├── middleware/      # Auth, activity logger
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── utils/           # Utilities (notifications, file upload, etc)
│   ├── uploads/         # Uploaded files
│   └── server.js        # Entry point
├── frontend/
│   ├── public/          # Static files, manifest, service worker
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React contexts (Auth, Notifications)
│   │   ├── pages/       # Page components
│   │   │   ├── admin/   # Admin pages
│   │   │   └── technician/ # Technician pages
│   │   ├── config/      # API configuration
│   │   └── App.js       # Main app component
│   └── package.json
└── package.json         # Root package.json
```

## Database Schema

### Tables
1. **users** - User accounts (admin, teknisi)
2. **tickets** - Ticket data
3. **ticket_actions** - Tindakan perbaikan
4. **notifications** - Notifikasi untuk users
5. **co_assignments** - Co-assignment records
6. **activity_logs** - Activity logging

## API Endpoints

### Public
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/track/:ticketNumber` - Track ticket

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/push-subscription` - Update push subscription

### Tickets (Authenticated)
- `GET /api/tickets` - Get all tickets (with filters)
- `GET /api/tickets/my-tasks` - Get my tasks
- `GET /api/tickets/:id` - Get ticket detail
- `POST /api/tickets/:id/take` - Take ticket
- `POST /api/tickets/:id/co-assign` - Co-assign ticket
- `PATCH /api/tickets/:id/status` - Update status
- `PATCH /api/tickets/:id/priority` - Update priority
- `POST /api/tickets/:id/actions` - Add action
- `POST /api/tickets/:id/proof` - Upload proof
- `DELETE /api/tickets/:id` - Soft delete (admin only)

### Admin
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `GET /api/dashboard/stats` - Dashboard stats
- `GET /api/dashboard/monthly` - Monthly chart data
- `GET /api/dashboard/yearly` - Yearly chart data
- `GET /api/reports/data` - Get report data
- `GET /api/reports/export/excel` - Export Excel
- `GET /api/reports/export/pdf` - Export PDF

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread/count` - Get unread count

## Security Features

1. **Authentication**: JWT-based authentication
2. **Authorization**: Role-based access control
3. **Password Security**: bcrypt hashing
4. **Input Validation**: express-validator
5. **Activity Logging**: All actions logged
6. **File Upload**: Size limit (25MB), type validation

## Mobile-First Design

- Responsive layout dengan Tailwind CSS
- Hamburger menu untuk mobile navigation
- Touch-friendly buttons dan inputs
- Optimized untuk berbagai screen sizes

## Notifikasi System

1. **Web Push API**: Menggunakan VAPID keys
2. **Service Worker**: Handle push events
3. **Sound Notification**: Audio playback saat notifikasi
4. **Database Storage**: Notifikasi disimpan di database
5. **Real-time Updates**: Polling setiap 30 detik

## Production Deployment

1. Build frontend: `npm run build` (di root)
2. Setup environment variables
3. Run migrations (otomatis via Sequelize sync)
4. Start servers: `npm start` (di root)

## Default Credentials

- **Username**: admin
- **Password**: admin123

**PENTING**: Ganti password setelah login pertama!

## File Structure Highlights

- **Backend**: RESTful API dengan Express
- **Frontend**: SPA dengan React Router
- **Database**: PostgreSQL dengan Sequelize ORM
- **PWA**: Service worker, manifest, offline support
- **Notifications**: Web Push API dengan suara

## Next Steps untuk Development

1. Setup database PostgreSQL
2. Install dependencies: `npm run install:all`
3. Generate VAPID keys: `cd backend && npm run generate-vapid`
4. Configure `.env` files
5. Run development: `npm run dev`

Lihat `SETUP.md` untuk panduan lengkap setup.

