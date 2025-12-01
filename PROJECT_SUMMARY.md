# Ticketing System RSUD - Project Summary

## Overview

Sistem ticketing berbasis web menggunakan PERN Stack (PostgreSQL, Express, React, Node.js) dengan Tailwind CSS dan PWA support. Sistem ini dirancang untuk mobile-first dengan kemampuan installable dan notifikasi real-time.

## Tech Stack

### Backend

- **Node.js** dengan Express.js
- **PostgreSQL** dengan Sequelize ORM
- **JWT** (jsonwebtoken) untuk authentication
- **Web Push API** (web-push) untuk notifications
- **Multer** untuk file upload
- **ExcelJS & PDFKit** untuk export laporan
- **bcryptjs** untuk password hashing
- **express-validator** untuk input validation
- **moment.js** untuk manipulasi tanggal
- **CORS** untuk cross-origin requests

### Frontend

- **React 18** dengan React Router v6
- **Tailwind CSS** untuk styling
- **Recharts** untuk charts dan visualisasi data
- **Axios** untuk API calls
- **Workbox** modules untuk PWA dan service worker:
  - workbox-precaching
  - workbox-routing
  - workbox-strategies
  - workbox-expiration
  - workbox-cacheable-response
  - dll
- **Radix UI** components (@radix-ui/react-\*) untuk UI components yang accessible
- **Lucide React** untuk icons
- **Class Variance Authority** & **clsx** untuk styling utilities
- **Web Push API** untuk push notifications

## Fitur Utama

### 1. Role-Based Access Control

- **Admin**: Manajemen user, monitoring semua tiket, dashboard dengan charts, export laporan
- **Teknisi SIMRS**: Hanya bisa handle tiket kategori SIMRS
- **Teknisi IPSRS**: Hanya bisa handle tiket kategori IPSRS
- **Staff RS (Public)**: Pelaporan tanpa login, tracking tiket

### 2. Ticket Management

- Manual ticket assignment oleh teknisi (take ticket)
- Co-assignment untuk minta bantuan teknisi lain
- Status tracking: Baru → Diproses → Selesai/Batal
- Prioritas: tinggi/sedang/rendah (dapat diubah)
- Tindakan perbaikan dengan kategori (in-progress/waiting/confirmed)
- Upload foto masalah (saat create ticket) dan bukti perbaikan (max 25MB per file)
- Proof photo untuk ticket yang selesai
- Pagination untuk list tickets (30 items per page)
- Search dan filter berdasarkan:
  - Status, Priority, Category
  - Tanggal (dateFrom, dateTo)
  - Keyword search (ticket number, reporter name, unit)
- Role-based ticket visibility:
  - Admin: Semua tiket
  - Teknisi SIMRS: Hanya tiket kategori SIMRS
  - Teknisi IPSRS: Hanya tiket kategori IPSRS

### 3. Notifications

- Push notifications dengan suara (notification-sound.mp3)
- Notifikasi muncul saat:
  - Tiket baru sesuai kategori teknisi (SIMRS/IPSRS)
  - Co-assignment dari teknisi lain
- Self-assign tidak mengirim notifikasi ke teknisi yang melakukan assign
- Notifikasi disimpan di database untuk tracking
- Polling notifikasi setiap 30 detik untuk update real-time
- Unread notification count badge
- Mark as read / Mark all as read functionality

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
rsud-ticketing-sys/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize database configuration
│   ├── db/
│   │   ├── init.js              # Database initialization & seeding
│   │   └── migrations/          # Database migrations
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & authorization
│   │   └── activityLogger.js    # Activity logging middleware
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Ticket.js            # Ticket model
│   │   ├── TicketAction.js      # Ticket action model
│   │   ├── Notification.js      # Notification model
│   │   ├── CoAssignment.js      # Co-assignment model
│   │   ├── ActivityLog.js       # Activity log model
│   │   └── index.js             # Models index with associations
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── tickets.js           # Ticket routes
│   │   ├── users.js             # User management routes
│   │   ├── notifications.js     # Notification routes
│   │   ├── dashboard.js         # Dashboard routes
│   │   └── reports.js           # Report & export routes
│   ├── utils/
│   │   ├── fileUpload.js        # Multer configuration
│   │   ├── notifications.js     # Web push notification utilities
│   │   ├── ticketNumber.js      # Ticket number generator
│   │   └── generateVapidKeys.js # VAPID key generator
│   ├── uploads/                 # Uploaded files directory
│   ├── server.js                # Express server entry point
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA manifest
│   │   ├── notification-sound.mp3 # Notification sound
│   │   └── ...                  # Other static files
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js        # Main layout component
│   │   │   ├── PrivateRoute.js  # Protected route wrapper
│   │   │   ├── ActionModal.js   # Action modal component
│   │   │   ├── NotificationMenu.js # Notification menu component
│   │   │   └── ui/              # Reusable UI components (Radix UI based)
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── input.jsx
│   │   │       ├── select.jsx
│   │   │       ├── table.jsx
│   │   │       └── ...
│   │   ├── context/
│   │   │   ├── AuthContext.js           # Authentication context
│   │   │   └── NotificationContext.js   # Notification context
│   │   ├── pages/
│   │   │   ├── Home.js                  # Home page (public report form)
│   │   │   ├── Login.js                 # Login page
│   │   │   ├── TrackTicket.js           # Public ticket tracking
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.js         # Admin dashboard
│   │   │   │   ├── AllTickets.js        # All tickets management
│   │   │   │   ├── TicketDetail.js      # Ticket detail view
│   │   │   │   └── UserManagement.js    # User management
│   │   │   └── technician/
│   │   │       ├── MyTasks.js           # My assigned tasks
│   │   │       ├── AllTasks.js          # All available tasks
│   │   │       └── TicketDetail.js      # Ticket detail view
│   │   ├── config/
│   │   │   └── api.js           # Axios configuration
│   │   ├── lib/
│   │   │   └── utils.js         # Utility functions
│   │   ├── service-worker.js    # Service worker configuration
│   │   ├── serviceWorkerRegistration.js # Service worker registration
│   │   ├── App.js               # Main app component with routing
│   │   └── index.js             # React entry point
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   └── package.json
└── package.json                 # Root package.json (concurrently scripts)
```

## Database Schema

### Tables

1. **users** - User accounts (admin, teknisi_simrs, teknisi_ipsrs)
   - Fields: id, username, email, phoneNumber, password (hashed), fullName, role, isActive, pushSubscription (JSONB)
2. **tickets** - Ticket data
   - Fields: id, ticketNumber (unique), reporterName, reporterUnit, reporterPhone, category (SIMRS/IPSRS), description, photoUrl, status, priority, assignedTo, reporterId, isActive, completedAt, proofPhotoUrl, timestamps
3. **ticket_actions** - Tindakan perbaikan
   - Fields: id, ticketId, actionType (in-progress/waiting/confirmed), description, photoUrl, createdBy, timestamps
4. **notifications** - Notifikasi untuk users
   - Fields: id, userId, title, message, type, isRead, relatedTicketId, timestamps
5. **co_assignments** - Co-assignment records
   - Fields: id, ticketId, technicianId, requestedBy, status (pending/accepted/rejected), timestamps
6. **activity_logs** - Activity logging
   - Fields: id, userId, action, resourceType, resourceId, details (JSONB), ipAddress, userAgent, timestamps

## API Endpoints

### Public

- `POST /api/tickets` - Create ticket
- `GET /api/tickets/track/:ticketNumber` - Track ticket

### Auth

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/push-subscription` - Update push subscription

### Tickets (Authenticated)

- `GET /api/tickets` - Get all tickets (with filters, pagination, search)
  - Query params: page, status, priority, category, dateFrom, dateTo, search
- `GET /api/tickets/my-tasks` - Get my tasks (assigned + co-assigned)
- `GET /api/tickets/:id` - Get ticket detail (with actions & co-assignments)
- `POST /api/tickets/:id/take` - Take ticket (self-assign)
- `POST /api/tickets/:id/co-assign` - Co-assign ticket to another technician
- `PATCH /api/tickets/:id/status` - Update ticket status
- `PATCH /api/tickets/:id/priority` - Update ticket priority
- `POST /api/tickets/:id/actions` - Add action (with optional photo upload)
- `POST /api/tickets/:id/proof` - Upload proof photo
- `DELETE /api/tickets/:id` - Soft delete (admin only, sets isActive=false)

### Admin

- `GET /api/users` - Get all users (with filters)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (with validation)
- `PUT /api/users/:id` - Update user (with password hashing)
- `GET /api/users/technicians/:role` - Get technicians by role
- `GET /api/dashboard/stats` - Dashboard stats (status counts, today's category breakdown)
- `GET /api/dashboard/monthly` - Monthly chart data (current month, daily breakdown)
- `GET /api/dashboard/yearly` - Yearly chart data (12 months, monthly breakdown)
- `GET /api/reports/data` - Get report data (with filters)
  - Query params: category, status, dateFrom, dateTo
- `GET /api/reports/export/excel` - Export to Excel (.xlsx)
- `GET /api/reports/export/pdf` - Export to PDF

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

1. **Web Push API**: Menggunakan VAPID keys (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
2. **Service Worker**: Handle push events menggunakan Workbox
3. **Sound Notification**: Audio playback (notification-sound.mp3) saat notifikasi
4. **Database Storage**: Notifikasi disimpan di database untuk persistence
5. **Real-time Updates**: Polling endpoint `/api/notifications/unread/count` setiap 30 detik
6. **Push Subscription**: Disimpan di user model sebagai JSONB untuk Web Push
7. **Subscription Management**: Update via `/api/auth/push-subscription`

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

- **Backend**: RESTful API dengan Express, middleware untuk auth & logging
- **Frontend**: SPA dengan React Router v6, Context API untuk state management
- **Database**: PostgreSQL dengan Sequelize ORM, auto-sync di development
- **PWA**: Service worker (Workbox), manifest.json, offline support, precaching
- **Notifications**: Web Push API dengan suara, database persistence
- **UI Components**: Radix UI untuk accessible components, Tailwind untuk styling
- **File Upload**: Multer dengan size limit 25MB, stored di backend/uploads/

## Environment Variables

### Backend (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_rsud
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_change_in_production
PORT=5000
NODE_ENV=development
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@rsud.local
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key
HOST=0.0.0.0
WDS_SOCKET_HOST=0.0.0.0
WDS_SOCKET_PORT=3000
```

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Generate VAPID keys
cd backend && npm run generate-vapid

# Run development (both frontend & backend)
npm run dev

# Run production build
npm run build
npm start
```

## Production Deployment

1. Setup PostgreSQL database
2. Configure environment variables (`.env` files)
3. Generate VAPID keys: `cd backend && npm run generate-vapid`
4. Build frontend: `npm run build`
5. Start servers: `npm start` (uses concurrently to run both)
6. Backend serves static files in production (if configured)
7. Frontend uses `serve` package to serve built files on port 3000

Lihat `README.md` untuk panduan setup lengkap.
