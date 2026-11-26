# 🚀 Panduan Deployment Docker di Server Ubuntu

Panduan lengkap untuk mendeploy aplikasi **Swiss-Belinn SKA Management System (SIPU)** ke server Ubuntu menggunakan **Docker** dan **Docker Compose**.

---

## 📋 Arsitektur Kontainer

Sistem ini menggunakan arsitektur multi-container yang siap produksi:

| Kontainer | Service | Deskripsi |
|---|---|---|
| `sipu_app` | `app` | PHP 8.3 FPM Alpine (Laravel Core + Ekstensi lengkap + OPcache) |
| `sipu_web` | `web` | Nginx Alpine (Reverse Proxy, HTTP/2, Gzip, Immutable Cache Vite) |
| `sipu_queue` | `queue` | Background Worker (`php artisan queue:work`) untuk email & notifikasi |
| `sipu_scheduler` | `scheduler` | Task Scheduler / Cron (`php artisan schedule:run` setiap 60 detik) |
| `sipu_mysql` | `mysql` | *(Opsional)* Database MySQL 8.0 jika tidak menggunakan SQLite default |

---

## 🛠️ Langkah-Langkah Deployment di Ubuntu

### 1. Install Docker & Docker Compose di Ubuntu

Jalankan perintah berikut di terminal server Ubuntu:

```bash
# Update paket sistem
sudo apt update && sudo apt upgrade -y

# Install Docker engine otomatis dari official Docker script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Tambahkan user aktif ke grup docker agar tidak perlu 'sudo' setiap saat
sudo usermod -aG docker $USER
newgrp docker

# Pastikan Docker Compose plugin terpasang
sudo apt install -y docker-compose-plugin

# Cek versi
docker --version
docker compose version
```

---

### 2. Clone Repository & Siapkan Direktori

```bash
# Clone repository ke server Anda
cd /var/www  # atau di direktori home Anda
git clone <URL_REPOSITORY_ANDA> sipu-management
cd sipu-management
```

---

### 3. Konfigurasi File Environment (`.env`)

Salin file template `.env.docker.example` menjadi `.env`:

```bash
cp .env.docker.example .env
```

Buka file `.env` dan sesuaikan nilainya:
```bash
nano .env
```
Hal penting yang perlu disesuaikan:
- `APP_URL=https://domain-anda.com` (atau `http://IP_SERVER_ANDA`)
- `APP_ENV=production`
- `APP_DEBUG=false`
- `MAIL_*` (konfigurasi SMTP email Anda untuk notifikasi)

> [!NOTE]
> Secara default, aplikasi menggunakan **SQLite** yang tersimpan di Docker volume persisten (`app_database`). Tidak memerlukan setup server MySQL terpisah!

---

### 4. Jalankan Deployment Otomatis

Anda cukup menjalankan skrip otomatisasi:

```bash
chmod +x deploy.sh
./deploy.sh
```

Atau jalankan perintah manual:

```bash
docker compose up -d --build
```

Entrypoint kontainer akan otomatis:
1. Memastikan folder `storage/`, `bootstrap/cache/`, dan `database/` memiliki izin (`www-data:www-data`).
2. Membuat database SQLite jika belum ada.
3. Menjalankan `php artisan key:generate` jika key belum terisi.
4. Menjalankan `php artisan storage:link` untuk symlink file publik/foto profil.
5. Menjalankan `php artisan migrate --force` untuk migrasi tabel database.
6. Mengoptimasi cache Laravel (`php artisan optimize`).

---

### 5. Memasang SSL / HTTPS (Let's Encrypt / Certbot)

Jika Anda memiliki domain publik (misal: `sipumanagement.my.id`):

#### Opsi A: Menggunakan Cloudflare (Paling Mudah)
- Arahkan domain DNS ke IP Public Server Anda.
- Aktifkan Proxy (Orange Cloud) di Cloudflare.
- Set mode SSL di Cloudflare ke **Full (Strict)** atau **Flexible**.

#### Opsi B: Certbot Standalone di Host
```bash
sudo apt install -y certbot

# Matikan sementara kontainer web port 80
docker compose stop web

# Generate sertifikat
sudo certbot certonly --standalone -d domain-anda.com -d www.domain-anda.com

# Buat symbolic link sertifikat ke folder docker/nginx/ssl
mkdir -p docker/nginx/ssl
sudo cp /etc/letsencrypt/live/domain-anda.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/domain-anda.com/privkey.pem docker/nginx/ssl/

# Nyalakan kembali kontainer
docker compose start web
```

---

## ⚙️ Perintah Operasional Harian

| Kebutuhan | Perintah |
|---|---|
| **Melihat status kontainer** | `docker compose ps` |
| **Melihat log real-time** | `docker compose logs -f` |
| **Melihat log web saja** | `docker compose logs -f web` |
| **Melihat log queue worker** | `docker compose logs -f queue` |
| **Menjalankan artisan command** | `docker compose exec app php artisan <perintah>` |
| **Menjalankan seeder awal** | `docker compose exec app php artisan db:seed --force` |
| **Restart semua kontainer** | `docker compose restart` |
| **Stop semua kontainer** | `docker compose down` |
| **Update code terbaru dari git** | `git pull && docker compose up -d --build` |

---

## 💾 Backup Data (SQLite & Uploads)

Semua data persisten disimpan di Docker volumes:
- `sipu_storage`: Folder `storage` (foto profil, lampiran task, file dokumen)
- `sipu_database`: File SQLite `database/database.sqlite`

Untuk membackup file database SQLite secara langsung:
```bash
docker compose exec app cp database/database.sqlite storage/app/backup-$(date +%F).sqlite
```
File backup akan tersimpan di storage host Anda.
