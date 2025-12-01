# Troubleshooting Guide

Panduan lengkap untuk mengatasi masalah umum pada Ticketing System RSUD.

## Daftar Isi

1. [Masalah: "Cannot GET /login" di localhost:5000](#masalah-cannot-get-login-di-localhost5000)
2. [Masalah: Tidak bisa login](#masalah-tidak-bisa-login)
3. [Masalah: Tidak bisa kirim laporan masalah](#masalah-tidak-bisa-kirim-laporan-masalah)
4. [Masalah: Database connection error](#masalah-database-connection-error)
5. [Masalah: CORS error](#masalah-cors-error)
6. [Masalah: Port sudah digunakan](#masalah-port-sudah-digunakan)
7. [Masalah: Push notifications tidak muncul](#masalah-push-notifications-tidak-muncul)
8. [Masalah: PWA tidak bisa diinstall](#masalah-pwa-tidak-bisa-diinstall)
9. [Masalah: Build error](#masalah-build-error)
10. [Masalah: File upload error](#masalah-file-upload-error)

---

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
   # atau untuk development dengan auto-reload
   npm run dev
   ```
   Harus muncul: "Server running on http://0.0.0.0:5000"

2. **Pastikan frontend berjalan**
   ```bash
   cd frontend
   npm start
   ```
   Harus muncul: "Compiled successfully!" dan buka di browser `http://localhost:3000`

3. **Cek koneksi database**
   - Pastikan PostgreSQL running
   - Windows: Cek di Services atau `pg_ctl status`
   - Linux/Mac: `sudo systemctl status postgresql` atau `pg_ctl status`
   - Cek file `backend/.env` sudah benar:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=ticketing_rsud
     DB_USER=postgres
     DB_PASSWORD=your_password
     ```
   - Database `ticketing_rsud` sudah dibuat:
     ```sql
     CREATE DATABASE ticketing_rsud;
     ```

4. **Cek environment variables**
   - `backend/.env` harus ada dan terisi dengan semua required variables
   - `frontend/.env` harus ada dengan:
     ```
     REACT_APP_API_URL=http://localhost:5000/api
     REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key
     ```

5. **Cek default admin account**
   - Default username: `admin`
   - Default password: `admin123`
   - Pastikan admin user sudah dibuat (otomatis saat pertama kali init database)

6. **Test API langsung**
   ```bash
   # Windows (Command Prompt atau PowerShell)
   curl http://localhost:5000/api/health
   
   # Test login
   curl -X POST http://localhost:5000/api/auth/login ^
     -H "Content-Type: application/json" ^
     -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
   
   # Linux/Mac
   curl http://localhost:5000/api/health
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

7. **Cek browser console**
   - Buka Developer Tools (F12)
   - Lihat tab Console untuk error messages
   - Lihat tab Network untuk HTTP request/response
   - Pastikan request ke `/api/auth/login` berhasil (status 200)

8. **Cek JWT Secret**
   - Pastikan `JWT_SECRET` di `backend/.env` sudah di-set
   - Jangan gunakan default secret di production

## Masalah: Tidak bisa kirim laporan masalah

### Checklist

1. **Cek backend berjalan**
   - Backend harus running di port 5000
   - Test health check: `curl http://localhost:5000/api/health`

2. **Cek CORS**
   - Pastikan CORS di backend mengizinkan origin frontend
   - Default: `http://localhost:3000`
   - Di development mode, semua origin diizinkan
   - Cek `backend/server.js` untuk CORS configuration

3. **Cek folder uploads**
   - Folder `backend/uploads/` harus ada
   - Jika belum ada, buat folder:
     ```bash
     mkdir backend/uploads
     ```
   - Pastikan ada permission write (chmod 755 atau 777 di Linux/Mac)

4. **Cek file size limit**
   - Max file size: 25MB
   - Jika file terlalu besar, error akan muncul

5. **Cek required fields**
   - reporterName (required)
   - reporterUnit (required)
   - reporterPhone (required)
   - category (SIMRS atau IPSRS)
   - description (required)

6. **Cek console browser**
   - Buka Developer Tools (F12)
   - Lihat tab Console dan Network
   - Cari error yang muncul
   - Pastikan request ke `/api/tickets` berhasil

7. **Test API langsung**
   ```bash
   # Windows
   curl -X POST http://localhost:5000/api/tickets ^
     -F "reporterName=Test" ^
     -F "reporterUnit=Test Unit" ^
     -F "reporterPhone=123456" ^
     -F "category=SIMRS" ^
     -F "description=Test description"
   
   # Linux/Mac
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
   # Cek di Services (services.msc) atau
   pg_ctl status
   # Atau start service:
   pg_ctl start
   
   # Linux
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # Mac
   brew services list
   brew services start postgresql
   ```

2. **Cek kredensial di backend/.env**
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ticketing_rsud
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```
   - Pastikan password sesuai dengan PostgreSQL user password
   - Jika menggunakan user berbeda, sesuaikan `DB_USER`

3. **Buat database jika belum ada**
   ```bash
   # Connect ke PostgreSQL
   psql -U postgres
   
   # Atau langsung create database
   createdb -U postgres ticketing_rsud
   
   # Atau via SQL
   psql -U postgres -c "CREATE DATABASE ticketing_rsud;"
   ```

4. **Test koneksi manual**
   ```bash
   # Test connection
   psql -h localhost -U postgres -d ticketing_rsud
   
   # Jika berhasil, akan masuk ke psql prompt
   # Ketik \q untuk keluar
   ```

5. **Cek firewall dan network**
   - Pastikan port 5432 tidak di-block firewall
   - Jika PostgreSQL di remote server, pastikan remote access diizinkan

6. **Cek Sequelize sync**
   - Database tables akan dibuat otomatis saat pertama kali run
   - Cek log backend untuk melihat error messages

## Masalah: CORS error

### Solusi

1. **Cek CORS configuration di backend/server.js**
   - Di development mode, semua origin sudah diizinkan
   - Di production, sesuaikan `FRONTEND_URL` di `.env`:
     ```
     FRONTEND_URL=http://localhost:3000,https://yourdomain.com
     ```

2. **Pastikan frontend/.env ada dan benar**
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Cek browser console**
   - Error CORS biasanya muncul di console browser
   - Pastikan request dari origin yang diizinkan

4. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)

5. **Jika masih error, restart kedua server**
   ```bash
   # Stop semua server, kemudian:
   npm run dev
   ```

## Masalah: Port sudah digunakan

### Solusi

1. **Cek port yang digunakan**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   netstat -ano | findstr :3000
   # Untuk kill process (ganti PID dengan angka dari netstat):
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :5000
   lsof -i :3000
   # Untuk kill process:
   kill -9 <PID>
   ```

2. **Ubah port backend di .env**
   ```
   # backend/.env
   PORT=5001
   ```

3. **Update frontend/.env**
   ```
   REACT_APP_API_URL=http://localhost:5001/api
   ```

4. **Ubah port frontend (optional)**
   - Edit `frontend/package.json`, ubah script start:
     ```json
     "start": "PORT=3001 react-scripts start"
     ```
   - Atau set environment variable:
     ```bash
     # Windows
     set PORT=3001 && npm start
     
     # Linux/Mac
     PORT=3001 npm start
     ```

## Masalah: Push notifications tidak muncul

### Solusi

1. **Pastikan VAPID keys sudah di-set**
   ```bash
   # Generate VAPID keys
   cd backend
   npm run generate-vapid
   ```
   - Copy Public Key ke `backend/.env` (VAPID_PUBLIC_KEY)
   - Copy Private Key ke `backend/.env` (VAPID_PRIVATE_KEY)
   - Copy Public Key ke `frontend/.env` (REACT_APP_VAPID_PUBLIC_KEY)

2. **Cek browser permission**
   - Browser harus mengizinkan notifications
   - Cek di browser settings
   - Clear permissions dan refresh halaman

3. **Cek service worker**
   - Buka Developer Tools (F12) → Application → Service Workers
   - Pastikan service worker terdaftar dan aktif
   - Jika error, unregister dan refresh

4. **Cek push subscription**
   - Buka Developer Tools → Application → Storage → IndexedDB
   - Pastikan ada data subscription
   - Atau cek di database: `SELECT push_subscription FROM users WHERE id = <user_id>`

5. **Test notification manually**
   - Login sebagai teknisi
   - Buat tiket baru sesuai kategori teknisi
   - Notifikasi harus muncul dalam 30 detik (polling interval)

6. **Cek network**
   - Pastikan HTTPS di production (required untuk Web Push)
   - HTTP hanya bekerja di localhost untuk development

## Masalah: PWA tidak bisa diinstall

### Solusi

1. **Cek manifest.json**
   - Pastikan file `frontend/public/manifest.json` ada dan valid
   - Cek di Developer Tools → Application → Manifest

2. **Cek service worker**
   - Service worker harus terdaftar dan aktif
   - Build production untuk service worker berfungsi penuh

3. **HTTPS requirement**
   - PWA installable membutuhkan HTTPS (kecuali localhost)
   - Gunakan HTTPS di production

4. **Browser support**
   - Chrome/Edge: Full support
   - Firefox: Limited support
   - Safari iOS: Limited support (Add to Home Screen)

5. **Test di production build**
   ```bash
   npm run build
   npm start
   ```

## Masalah: Build error

### Solusi

1. **Clear cache dan node_modules**
   ```bash
   # Root
   npm cache clean --force
   rm -rf node_modules package-lock.json
   
   # Backend
   cd backend
   rm -rf node_modules package-lock.json
   
   # Frontend
   cd frontend
   rm -rf node_modules package-lock.json
   
   # Reinstall
   npm run install:all
   ```

2. **Cek Node.js version**
   - Minimal Node.js v16
   ```bash
   node --version
   ```

3. **Cek environment variables**
   - Pastikan semua required variables di-set

4. **Cek syntax errors**
   - Run linter: `npm run lint` (jika tersedia)
   - Cek error messages di console

## Masalah: File upload error

### Solusi

1. **Cek folder uploads**
   ```bash
   mkdir backend/uploads
   chmod 755 backend/uploads  # Linux/Mac
   ```

2. **Cek file size**
   - Max size: 25MB
   - File terlalu besar akan error

3. **Cek file type**
   - Hanya image files yang diizinkan
   - Format: jpg, jpeg, png, gif

4. **Cek Multer configuration**
   - Cek `backend/utils/fileUpload.js`
   - Pastikan destination dan limits sesuai

5. **Cek disk space**
   - Pastikan ada cukup space di disk

---

## Debugging Tips

1. **Cek log backend**
   - Lihat console output saat menjalankan backend
   - Cari error messages dengan detail

2. **Cek log frontend**
   - Buka browser Developer Tools (F12)
   - Tab Console untuk JavaScript errors
   - Tab Network untuk HTTP requests/responses
   - Tab Application untuk Storage, Service Workers, dll

3. **Test API dengan Postman atau curl**
   - Test endpoint satu per satu
   - Pastikan request format benar
   - Cek response status dan body

4. **Cek database**
   - Pastikan tables sudah dibuat (otomatis via Sequelize)
   - Cek data di database:
     ```sql
     SELECT * FROM users;
     SELECT * FROM tickets;
     ```

5. **Enable verbose logging**
   - Set `NODE_ENV=development` untuk detailed error messages
   - Check backend logs untuk SQL queries (jika enabled)

## Quick Fix Commands

```bash
# Install semua dependencies
npm run install:all

# Buat folder uploads (jika belum ada)
mkdir backend/uploads

# Generate VAPID keys
cd backend
npm run generate-vapid

# Clear cache dan reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
cd backend && rm -rf node_modules package-lock.json
cd ../frontend && rm -rf node_modules package-lock.json
cd .. && npm run install:all

# Run development mode
npm run dev

# Build production
npm run build

# Run production
npm start
```

## Default Credentials

- **Username**: admin
- **Password**: admin123

**PENTING**: Ganti password setelah login pertama kali!

## Getting Help

Jika masalah masih belum teratasi:

1. Cek error messages lengkap di console/log
2. Cek GitHub issues (jika ada)
3. Pastikan semua prerequisites terpenuhi (Node.js, PostgreSQL)
4. Pastikan semua dependencies terinstall dengan benar
5. Cek environment variables sudah benar semua

