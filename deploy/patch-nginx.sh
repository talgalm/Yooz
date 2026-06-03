#!/usr/bin/env bash
# Apply high-concurrency nginx tuning on EC2. Safe to re-run (idempotent-ish).
set -euo pipefail

UPSTREAM_CONF="/etc/nginx/conf.d/yooz-upstream.conf"
SITE_CONF="/etc/nginx/sites-available/yooz"

echo "=== Patching nginx for participant load ==="

sudo cp /opt/yooz/deploy/nginx-yooz-upstream.conf "$UPSTREAM_CONF"

if [ ! -f "$SITE_CONF" ]; then
  echo "  $SITE_CONF not found — skip site patch"
  exit 0
fi

# Point proxy at keepalive upstream instead of raw localhost:3000
sudo sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://yooz_backend;|g' "$SITE_CONF"
sudo sed -i 's|proxy_pass http://127.0.0.1:3000;|proxy_pass http://yooz_backend;|g' "$SITE_CONF"

# Timeouts & body size (collage jobs still need long read timeout)
sudo sed -i 's/client_max_body_size [0-9]\+M;/client_max_body_size 200M;/g' "$SITE_CONF"
sudo sed -i 's/proxy_read_timeout [0-9]\+s;/proxy_read_timeout 900s;/g' "$SITE_CONF"
if grep -q 'proxy_send_timeout' "$SITE_CONF"; then
  sudo sed -i 's/proxy_send_timeout [0-9]\+s;/proxy_send_timeout 900s;/g' "$SITE_CONF"
else
  sudo sed -i '/proxy_read_timeout 900s;/a\        proxy_send_timeout 900s;' "$SITE_CONF"
fi
if ! grep -q 'proxy_connect_timeout' "$SITE_CONF"; then
  sudo sed -i '/proxy_pass http:\/\/yooz_backend;/a\        proxy_connect_timeout 75s;' "$SITE_CONF"
fi

if ! grep -q 'proxy_http_version 1.1' "$SITE_CONF"; then
  sudo sed -i '/proxy_pass http:\/\/yooz_backend;/a\        proxy_http_version 1.1;\n        proxy_set_header Connection "";' "$SITE_CONF"
fi

# Raise worker_connections for burst TLS handshakes
if [ -f /etc/nginx/nginx.conf ] && grep -q 'worker_connections' /etc/nginx/nginx.conf; then
  sudo sed -i 's/worker_connections [0-9]\+;/worker_connections 4096;/g' /etc/nginx/nginx.conf
fi

sudo nginx -t && sudo systemctl reload nginx
echo "  nginx patched and reloaded"
