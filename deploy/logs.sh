#!/bin/bash
# Stream live logs from the server
source "$(dirname "$0")/.ec2-info"
echo "📋 Streaming logs from $PUBLIC_IP (Ctrl+C to stop)..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_IP" \
  "pm2 logs yooz --lines 50"
