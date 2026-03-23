#!/bin/bash
# Quick SSH into the server
source "$(dirname "$0")/.ec2-info"
echo "🔗 Connecting to $PUBLIC_IP..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_IP"
