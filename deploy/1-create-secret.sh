#!/bin/bash
# ============================================================
# STEP 1 — Push all env vars to AWS Secrets Manager
# Run this once (or again if you update env values).
# ============================================================
set -e

REGION="${AWS_REGION:-eu-west-1}"
SECRET_NAME="yooz/production"

# Load local .env
ENV_FILE="$(dirname "$0")/../.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found at $ENV_FILE"
  exit 1
fi
source "$ENV_FILE"

# Preserve existing JWT_SECRET so we don't log out all users on re-runs
echo "🔍 Checking for existing secret..."
EXISTING_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" --region "$REGION" \
  --query SecretString --output text 2>/dev/null || echo "{}")

EXISTING_JWT=$(echo "$EXISTING_SECRET" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('JWT_SECRET', ''))
except:
    print('')
" 2>/dev/null)

if [ -z "$EXISTING_JWT" ]; then
  JWT_PROD=$(openssl rand -base64 48)
  echo "🔑 Generated new JWT_SECRET for production"
else
  JWT_PROD="$EXISTING_JWT"
  echo "🔑 Keeping existing JWT_SECRET"
fi

# Build secret JSON (ADMIN_PASSWORD prompt if still default)
if [ "$ADMIN_PASSWORD" = "admin123" ]; then
  echo ""
  echo "⚠️  ADMIN_PASSWORD is still 'admin123' — please enter a strong production password:"
  read -s -p "  New admin password: " ADMIN_PASSWORD
  echo ""
fi

SECRET_JSON=$(python3 -c "
import json
secret = {
    'JWT_SECRET':              '''$JWT_PROD''',
    'PORT':                    '3000',
    'ADMIN_EMAIL':             '''$ADMIN_EMAIL''',
    'ADMIN_PASSWORD':          '''$ADMIN_PASSWORD''',
    'MONGODB_URI':             '''$MONGODB_URI''',
    'VITE_GOOGLE_CLIENT_ID':   '''$VITE_GOOGLE_CLIENT_ID''',
    'CLOUDINARY_CLOUD_NAME':   '''$CLOUDINARY_CLOUD_NAME''',
    'CLOUDINARY_API_KEY':      '''$CLOUDINARY_API_KEY''',
    'CLOUDINARY_API_SECRET':   '''$CLOUDINARY_API_SECRET''',
    'GEMINI_API_KEY':          '''$GEMINI_API_KEY''',
    'CORS_ORIGIN':             'https://yooz.org.il,https://www.yooz.org.il'
}
print(json.dumps(secret))
")

# Create or update the secret
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" &>/dev/null; then
  echo "⟳  Updating existing secret..."
  aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" > /dev/null
else
  echo "➕ Creating new secret..."
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Yooz production environment variables" \
    --secret-string "$SECRET_JSON" \
    --region "$REGION" > /dev/null
fi

echo ""
echo "✅ Secret saved to AWS Secrets Manager: $SECRET_NAME (region: $REGION)"
echo "   The EC2 instance will load these on every deploy."
