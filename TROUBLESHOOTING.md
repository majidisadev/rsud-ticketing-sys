# Troubleshooting Guide

## Masalah: "Cannot GET /login" di localhost:5000

### Penjelasan
Error ini terjadi karena Anda mencoba mengakses halaman frontend (`/login`) di backend server. 

**Backend (localhost:5000)** hanya menyediakan:
- API endpoints di `/api/*`
- Contoh: `/api/auth/login`, `/api/tickets`, dll

**Frontend (localhost:3000)** yang menangani:
- Halaman web seperti `/login`, `/`, `/admin/dashboard`, dll

### Solusi

1. **Akses Frontend di localhost:3000**
   - Buka browser dan akses: `http://localhost:3000`
   - Atau `http://localhost:3000/login` untuk halaman login

2. **Backend API di localhost:5000**
   - API endpoint: `http://localhost:5000/api/auth/login` (POST request)
   - Health check: `http://localhost:5000/api/health` (GET request)

## Masalah: Tidak bisa login

### Checklist

1. **Pastikan backend berjalan**
   ```bash
   cd backend
   npm start
   # atau
   npm run dev
   ```
   Harus muncul: "Server running on port 5000"

2. **Pastikan frontend berjalan**
   ```bash
   cd frontend
   npm start
   ```
   Harus muncul: "Compiled successfully!" dan buka di browser

3. **Cek koneksi database**
   - Pastikan PostgreSQL running
   - Cek file `backend/.env` sudah benar
   - Database `ticketing_rsud` sudah dibuat

4. **Cek environment variables**
   - `backend/.env` harus ada dan terisi
   - `frontend/.env` harus ada dengan `REACT_APP_API_URL=http://localhost:5000/api`

5. **Test API langsung**
   ```bash
   # Test health check
   curl http://localhost:5000/api/health
   
   # Test login (ganti username dan password)
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

## Masalah: Tidak bisa kirim laporan masalah

### Checklist

1. **Cek backend berjalan**
   - Backend harus running di port 5000

2. **Cek CORS**
   - Pastikan CORS di backend mengizinkan origin frontend
   - Default: `http://localhost:3000`

3. **Cek folder uploads**
   - Folder `backend/uploads/` harus ada
   - Pastikan ada permission write

4. **Cek console browser**
   - Buka Developer Tools (F12)
   - Lihat tab Console dan Network
   - Cari error yang muncul

5. **Test API langsung**
   ```bash
   curl -X POST http://localhost:5000/api/tickets \
     -F "reporterName=Test" \
     -F "reporterUnit=Test Unit" \
     -F "reporterPhone=123456" \
     -F "category=SIMRS" \
     -F "description=Test description"
   ```

## Masalah: Database connection error

### Solusi

1. **Pastikan PostgreSQL running**
   ```bash
   # Windows
   # Cek di Services atau
   pg_ctl status
   ```

2. **Cek kredensial di backend/.env**
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ticketing_rsud
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. **Buat database jika belum ada**
   ```sql
   CREATE DATABASE ticketing_rsud;
   ```

4. **Test koneksi manual**
   ```bash
   psql -h localhost -U postgres -d ticketing_rsud
   ```

## Masalah: CORS error

### Solusi

1. **Update backend/server.js**
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true
   }));
   ```

2. **Pastikan frontend/.env ada**
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

## Masalah: Port sudah digunakan

### Solusi

1. **Cek port yang digunakan**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   ```

2. **Ubah port di .env**
   ```
   # backend/.env
   PORT=5001
   ```

3. **Update frontend/.env**
   ```
   REACT_APP_API_URL=http://localhost:5001/api
   ```

## Debugging Tips

1. **Cek log backend**
   - Lihat console output saat menjalankan backend
   - Cari error messages

2. **Cek log frontend**
   - Buka browser Developer Tools (F12)
   - Tab Console untuk JavaScript errors
   - Tab Network untuk HTTP requests/responses

3. **Test API dengan Postman atau curl**
   - Test endpoint satu per satu
   - Pastikan request format benar

4. **Cek database**
   - Pastikan tables sudah dibuat
   - Cek data di database

## Quick Fix Commands

```bash
# Install semua dependencies
npm run install:all

# Buat folder uploads
mkdir backend/uploads

# Generate VAPID keys
cd backend
npm run generate-vapid

# Test backend
cd backend
npm start

# Test frontend (di terminal lain)
cd frontend
npm start
```

## Default Credentials

- **Username**: admin
- **Password**: admin123

**PENTING**: Ganti password setelah login pertama!

