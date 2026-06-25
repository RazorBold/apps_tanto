# Solar Tracker Dashboard — Deployment Guide (VM)

App ini adalah dashboard instalasi solar tracker berbasis Node.js + Express + SQLite (sql.js).
Port yang dipakai: **5031**

---

## Prasyarat

Jalankan perintah ini di VM untuk install semua yang dibutuhkan:

```bash
# Update package list
sudo apt update

# Install Node.js 20 LTS (jika belum ada)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v   # harus >= 20.x
npm -v

# Install PM2 (process manager agar app tetap jalan)
sudo npm install -g pm2

# Install git (jika belum ada)
sudo apt install -y git
```

---

## Deploy

```bash
# Clone repo
git clone https://github.com/RazorBold/apps_tanto.git
cd apps_tanto

# Install dependencies
npm install

# Buat folder data (untuk database & foto upload)
mkdir -p /data/uploads
```

---

## Environment Variables

Buat file `.env` di dalam folder project:

```bash
cat > .env << 'EOF'
PORT=5031
DATA_DIR=/data
JWT_SECRET=ganti-dengan-string-acak-panjang-dan-unik
EOF
```

> **Penting:** Ganti nilai `JWT_SECRET` dengan string acak yang kuat, contoh:
> `JWT_SECRET=xK9#mPq2vL8$nRt5wYu3sAe7!Zj4bQc`

---

## Jalankan dengan PM2

**Step 1** — Edit file `ecosystem.config.js`, ganti nilai `JWT_SECRET`:

```js
// ecosystem.config.js
env: {
  PORT: 5031,
  DATA_DIR: '/data',
  JWT_SECRET: 'GANTI_INI_DENGAN_STRING_ACAK'  // <-- ganti ini
}
```

**Step 2** — Jalankan:

```bash
pm2 start ecosystem.config.js

# Pastikan PM2 otomatis start saat VM reboot
pm2 startup
pm2 save
```

---

## Verifikasi

```bash
# Cek status app
pm2 status

# Lihat log
pm2 logs solar-tracker

# Test lokal di VM
curl http://localhost:5031
# Harus return HTML halaman login
```

Log yang benar saat berhasil:
```
✅ Created new database   (pertama kali)
✅ Default admin user created (admin / admin123)
✅ Database initialized
🔆 Solar Tracker Dashboard running at http://localhost:5031
```

---

## Akses dari Luar

Pastikan port 5031 sudah dibuka di firewall VM:

```bash
# UFW (Ubuntu)
sudo ufw allow 5031
sudo ufw status

# Atau iptables
sudo iptables -A INPUT -p tcp --dport 5031 -j ACCEPT
```

App bisa diakses di:
```
http://<IP-VM>:5031
```

---

## Login Default

| Username | Password |
|----------|----------|
| `admin`  | `admin123` |

> **Segera ganti password admin setelah login pertama.**

---

## Update App (jika ada perubahan kode)

```bash
cd apps_tanto
git pull origin main
npm install
pm2 restart solar-tracker
```

---

## Struktur Data Persisten

```
/data/
├── solar_tracker.db    ← database utama
└── uploads/            ← foto instalasi
```

Backup folder `/data` secara berkala agar data tidak hilang.

---

## Troubleshooting

**App tidak jalan / error:**
```bash
pm2 logs solar-tracker --lines 50
```

**Port sudah dipakai:**
```bash
sudo lsof -i :5031
# Kill proses lama jika perlu
```

**Database corrupt:**
```bash
# Backup dulu
cp /data/solar_tracker.db /data/solar_tracker.db.bak
# Hapus database (akan dibuat ulang dengan data kosong)
rm /data/solar_tracker.db
pm2 restart solar-tracker
```
