# HDDTracking
# **README — HDD Tracking Web App**

## Overview
**HDD Tracking Web App** adalah aplikasi berbasis web untuk mencatat, mengelola, dan memantau data HDD (Hard Disk Drive) pada DeepOcean Indonesia.\
Aplikasi ini dirancang menggunakan **HTML, CSS, dan JavaScript**, dan berjalan menggunakan **GitHub Pages** sebagai hosting.
Selain itu, aplikasi terhubung dengan **Google Sheets API (via Apps Script)** untuk memungkinkan:
*   Menyimpan data HDD secara online
*   Mengambil data secara real-time
*   Import & Export Excel
*   Menampilkan tabel data HDD
*   Mengelola form Transmittal

## Features
### **1. Input Data**
*   Form untuk memasukkan data HDD baru
*   Field seperti: Item No, Job Yr, Project No, dll
*   Data dikirim otomatis ke Google Sheets melalui API
  
### **2. Cek Data**
*   Tabel dinamis menampilkan seluruh data HDD
*   Fitur **Search** (pencarian HDD)
*   Fitur **Sort** tabel
*   Import file Excel (.xls / .xlsx)
*   Export data menjadi Excel

### **3. Transmittal Form**
*   Form pembuatan dokumen transmittal
*   Input nomor transmittal, tanggal, client, dll
*   (Opsional) Generate PDF

### **4. UI & Navigasi**
*   Sidebar navigasi
*   Dark Mode toggle
*   Responsive layout (mobile-friendly)
   
### **5. Google Sheets Integration**
Web app ini terhubung ke Google Sheets melalui Apps Script Web App yang berfungsi sebagai API:
*   `GET` → Mengambil data HDD
*   `POST` → Menambahkan data HDD
*   Penyimpanan data dilakukan secara cloud, bukan lokal

## Folder Structure
    HDDTracking/
    │
    ├── index.html              <-- Halaman utama
    ├── style.css               <-- Styling (UI)
    ├── app.js                  <-- Logic JavaScript (+ API Sheets)
    ├── testAPI.html            <-- Halaman testing API Google Sheets
    │
    ├── assets/                 <-- Folder gambar/logo
    │   └── deepocean-logo.jpg
    │
    └── README.md


## Live Demo (via GitHub Pages)
Aplikasi dapat diakses melalui:
**<https://adhimawork-png.github.io/HDDTracking/>**

## Cara Deploy (GitHub Pages)
1.  Push semua file ke repo GitHub
2.  Masuk tab **Settings** → **Pages**
3.  Source: **Deploy from branch**
4.  Branch: `main` — Folder: `/ (root)`
5.  Tunggu 1–2 menit hingga link live

## Google Sheets API Integration (Apps Script)
Aplikasi menggunakan Apps Script sebagai backend:

### Endpoint API:
    https://script.google.com/macros/s/<YOUR_SCRIPT_ID>/exec

### 1. GET — Ambil Data
```js
fetch(API_URL)
  .then(res => res.json())
  .then(data => console.log(data));
```

### 2. POST — Kirim Data
```js
fetch(API_URL, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({ row: {...dataHDD} })
});
```

## Cara Upload Logo
1.  Masuk folder `assets/`
2.  Klik **Add file → Upload files**
3.  Upload file JPG logo
4.  Di HTML gunakan:

## UI/UX Notes
*   Sidebar tetap (sticky)
*   Warna konsisten (teal + putih)
*   Tombol memiliki hover effect
*   Table responsive & scrollable

## Catatan Pengembangan
Fitur tambahan yang dapat dikembangkan selanjutnya:
*   Auto-ID Generator
*   Validasi input yang lebih lengkap
*   Pagination di tabel
*   Dashboard summary (jumlah HDD, lokasi, status)
*   Login (auth) untuk membatasi akses
*   Proteksi API (API Key)

## Developer
**Adhima Al Azmy**\
Management Trainee — DeepOcean\
HDD Tracking System Project
