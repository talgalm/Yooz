#!/usr/bin/env bash
# Apply high-concurrency nginx tuning on EC2. Safe to re-run (idempotent-ish).
set -eu

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

# Enable multi_accept so each worker grabs all pending connections at once
if [ -f /etc/nginx/nginx.conf ] && ! grep -q 'multi_accept' /etc/nginx/nginx.conf; then
  sudo sed -i '/worker_connections [0-9]\+;/a\        multi_accept on;' /etc/nginx/nginx.conf
fi

# Raise TCP backlog on listen directives so the kernel queues more SYNs
# Matches: listen 443 ssl; or listen 80; (with or without extra params, no backlog yet)
if [ -f "$SITE_CONF" ] && ! grep -q 'backlog' "$SITE_CONF"; then
  sudo sed -i 's/listen \([0-9]\+\)\(.*\);/listen \1\2 backlog=4096;/g' "$SITE_CONF"
fi

# Kernel TCP tuning — persist across reboots via sysctl.d
sudo tee /etc/sysctl.d/99-yooz.conf > /dev/null <<'SYSCTL'
# Accept queue depth — allows kernel to buffer 1000+ simultaneous SYNs
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
# Keep-alive tuning for long-lived participant connections
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-yooz.conf

sudo nginx -t && sudo systemctl reload nginx
echo "  nginx patched and reloaded"
