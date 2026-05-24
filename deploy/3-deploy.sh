#!/bin/bash
# ============================================================
# STEP 3 — Deploy code to EC2, build, and start/restart app
# Run this for the FIRST deploy AND every time you update code.
# ============================================================
set -e

SCRIPT_DIR="$(dirname "$0")"
INFO_FILE="$SCRIPT_DIR/.ec2-info"
SECRET_NAME="yooz/production"

# Load EC2 info
if [ ! -f "$INFO_FILE" ]; then
  echo "❌ .ec2-info not found. Run 2-launch-ec2.sh first."
  exit 1
fi
source "$INFO_FILE"

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=10"
SSH="ssh $SSH_OPTS ubuntu@$PUBLIC_IP"
SCP="scp $SSH_OPTS"

echo "🚀 Deploying Yooz to $PUBLIC_IP"
echo "================================================"

# ── 1. Wait for SSH to be ready ──────────────────────────────
echo "⏳ Waiting for SSH..."
for i in $(seq 1 20); do
  if $SSH "exit" 2>/dev/null; then
    echo "   ✅ SSH ready"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "❌ SSH not available after 2 minutes. Is the instance running?"
    exit 1
  fi
  sleep 6
done

# ── 2. Sync source code (no node_modules, no dist) ──────────
echo "📦 Syncing source code..."
rsync -az --progress \
  -e "ssh $SSH_OPTS" \
  --exclude 'node_modules' \
  --exclude 'client/dist' \
  --exclude 'server/dist' \
  --exclude '.git' \
  --exclude 'deploy/.ec2-info' \
  "$SCRIPT_DIR/../" \
  "ubuntu@$PUBLIC_IP:/opt/yooz/"

echo "   ✅ Code synced"

# ── 3. Remote: fetch secrets → build → restart ──────────────
echo "🔧 Building and starting on server..."

$SSH bash <<REMOTE
set -e

REGION="$REGION"
SECRET_NAME="$SECRET_NAME"

echo "--- Fetching secrets from AWS Secrets Manager..."
aws secretsmanager get-secret-value \
  --secret-id "\$SECRET_NAME" \
  --region "\$REGION" \
  --query SecretString \
  --output text | python3 -c "
import sys, json
secret = json.load(sys.stdin)
with open('/etc/yooz/prod.env', 'w') as f:
    for k, v in secret.items():
        f.write(f'{k}={v}\n')
print('  Wrote', len(secret), 'env vars to /etc/yooz/prod.env')
"
chmod 600 /etc/yooz/prod.env

echo "--- Loading env vars..."
set -a; source /etc/yooz/prod.env; set +a

echo "--- Installing server dependencies..."
cd /opt/yooz/server
npm install --omit=dev 2>&1 | tail -3

echo "--- Installing devDependencies for build..."
npm install 2>&1 | tail -3

echo "--- Building server (TypeScript)..."
npm run build

echo "--- Installing client dependencies..."
cd /opt/yooz/client
npm install 2>&1 | tail -3

echo "--- Building client (Vite + env vars)..."
npm run build

echo "--- Setting up PM2..."
pm2 stop yooz 2>/dev/null || true
pm2 delete yooz 2>/dev/null || true
pm2 start /opt/yooz/deploy/ecosystem.config.js
pm2 save

# Enable PM2 on reboot (run once)
if ! crontab -l 2>/dev/null | grep -q pm2; then
  pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true
  pm2 save
fi

echo "--- Checking app status..."
sleep 2
pm2 show yooz | grep -E "status|uptime|restart"
REMOTE

# ── 4. Setup Nginx + SSL (first deploy only) ─────────────────
NGINX_CONF_REMOTE="/etc/nginx/sites-available/yooz"

echo "🌐 Configuring Nginx..."
$SSH bash <<NGINX
set -e

# Write Nginx config
sudo tee $NGINX_CONF_REMOTE > /dev/null <<'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name yooz.org.il www.yooz.org.il;

    client_max_body_size 200M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINXCONF

sudo ln -sf $NGINX_CONF_REMOTE /etc/nginx/sites-enabled/yooz
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
echo "   ✅ Nginx configured"
NGINX

# ── 5. SSL with Certbot (first deploy only) ──────────────────
CERT_EXISTS=$($SSH "sudo test -d /etc/letsencrypt/live/yooz.org.il && echo yes || echo no")

if [ "$CERT_EXISTS" = "no" ]; then
  echo "🔐 Setting up SSL certificate..."
  echo "   ⚠️  Make sure DNS is pointing to $PUBLIC_IP before continuing."
  echo ""
  read -p "   Is DNS set up? (y/n): " DNS_READY
  if [ "$DNS_READY" = "y" ]; then
    $SSH bash <<SSL
sudo certbot --nginx \
  -d yooz.org.il \
  -d www.yooz.org.il \
  --non-interactive \
  --agree-tos \
  --email admin@yooz.org.il \
  --redirect
echo "✅ SSL certificate installed"
SSL
  else
    echo "   ⏭️  Skipping SSL for now. Run this script again after DNS is set."
    echo "   Or SSH in and run: sudo certbot --nginx -d yooz.org.il -d www.yooz.org.il"
  fi
else
  echo "🔐 SSL certificate already installed ✅"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  🎉 Deploy Complete!                             ║"
echo "╠══════════════════════════════════════════════════╣"
printf "║  URL    : https://yooz.org.il%-21s║\n" ""
printf "║  IP     : http://%-33s║\n" "$PUBLIC_IP"
echo "║                                                  ║"
echo "║  SSH in : bash deploy/ssh.sh                     ║"
echo "║  Logs   : bash deploy/logs.sh                    ║"
echo "╚══════════════════════════════════════════════════╝"
