# 🚀 Master Deployment Guide (Conflict-Free)

This guide ensures the Cafe Dashboard runs independently on **Port 3050** to avoid conflicts with other websites on the VPS.

## 1. Push to GitHub
I have committed the conflict-resolution files locally. Run this to push:

```bash
# If your key is configured correctly:
git push origin main
```

*(If you have issues pushing, ensure your SSH key is added to GitHub)*

---

## 2. VPS Deployment (The "Index Ingen" Setup)

SSH into your server:
```bash
ssh -i zap-hosting.pri root@45.146.254.47
```

### Step A: Update Code
```bash
cd /var/www/cafe-management-dashboard  # (Or your folder)
git pull origin main
cd web-app
npm install
npm run build
```

### Step B: Start App on Port 3050 (Isolated)
We use `pm2` with the new config to lock the port to 3050.

```bash
# Start/Restart using the ecosystem file
pm2 start ecosystem.config.js
pm2 save
```
*Result: App runs on `localhost:3050`.*

### Step C: Configure Nginx (The Proxy)
We use Nginx to map the domain to port 3050.

```bash
# 1. Copy the config
cp ../nginx_cafe.conf /etc/nginx/sites-available/cafe-dashboard

# 2. Enable it
ln -s /etc/nginx/sites-available/cafe-dashboard /etc/nginx/sites-enabled/

# 3. Test and Reload
nginx -t
systemctl reload nginx
```

## 3. Verified Features
- **Port Conflict Fix**: App is locked to 3050.
- **Large Uploads**: Nginx `client_max_body_size 64M` enabled for SQL dumps.
- **Smart Import**: `/settings` page works for DB restores.

## 4. Live Database
Since the VPS (`45.x`) is whitelisted, the app will automatically connect to the Live DB if you set `.env.local` on the server:

```bash
# On Server: inside web-app/.env.local
DATABASE_URL="mysql://hossam:hossam%40%40123%21%21MM@db.lenteagency.com:3306/cafe_management"
DATA_SOURCE="mysql"
```
