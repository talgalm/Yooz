#!/bin/bash
# ============================================================
# STEP 2 — Launch EC2 instance & bootstrap everything
# Run this ONCE to create your server. Takes ~5 minutes.
# ============================================================
set -e

REGION="${AWS_REGION:-eu-west-1}"
INSTANCE_TYPE="t3.small"
KEY_NAME="yooz-key"
SG_NAME="yooz-sg"
ROLE_NAME="yooz-ec2-role"
PROFILE_NAME="yooz-ec2-profile"
SECRET_NAME="yooz/production"
APP_DIR="$(dirname "$0")"

echo "🚀 Launching Yooz on AWS EC2 (region: $REGION)"
echo "================================================"

# ── 1. SSH Key Pair ──────────────────────────────────────────
KEY_FILE="$HOME/.ssh/${KEY_NAME}.pem"
if [ ! -f "$KEY_FILE" ]; then
  echo "🔑 Creating SSH key pair..."
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --query 'KeyMaterial' \
    --output text \
    --region "$REGION" > "$KEY_FILE"
  chmod 400 "$KEY_FILE"
  echo "   Saved to $KEY_FILE"
else
  echo "🔑 Using existing key: $KEY_FILE"
fi

# ── 2. IAM Role (allows EC2 to read Secrets Manager) ────────
echo "👤 Setting up IAM role..."
if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{
        "Effect":"Allow",
        "Principal":{"Service":"ec2.amazonaws.com"},
        "Action":"sts:AssumeRole"
      }]
    }' > /dev/null

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/SecretsManagerReadWrite"

  aws iam create-instance-profile \
    --instance-profile-name "$PROFILE_NAME" > /dev/null

  aws iam add-role-to-instance-profile \
    --instance-profile-name "$PROFILE_NAME" \
    --role-name "$ROLE_NAME"

  echo "   Waiting for profile to propagate..."
  sleep 10
  echo "   ✅ IAM role ready"
else
  echo "   ✅ IAM role already exists"
fi

# ── 3. Security Group ────────────────────────────────────────
echo "🔒 Setting up security group..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' \
  --output text --region "$REGION" 2>/dev/null)

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "Yooz web server security group" \
    --region "$REGION" \
    --query 'GroupId' --output text)

  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
    --ip-permissions \
    '[
      {"IpProtocol":"tcp","FromPort":22,"ToPort":22,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"SSH"}]},
      {"IpProtocol":"tcp","FromPort":80,"ToPort":80,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"HTTP"}]},
      {"IpProtocol":"tcp","FromPort":443,"ToPort":443,"IpRanges":[{"CidrIp":"0.0.0.0/0","Description":"HTTPS"}]}
    ]' > /dev/null
  echo "   ✅ Security group created: $SG_ID"
else
  echo "   ✅ Security group exists: $SG_ID"
fi

# ── 4. AMI — Latest Ubuntu 22.04 LTS ────────────────────────
echo "🖼️  Finding latest Ubuntu 22.04 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text --region "$REGION")
echo "   AMI: $AMI_ID"

# ── 5. User Data (bootstrap script on first boot) ───────────
USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
exec > /var/log/yooz-bootstrap.log 2>&1
echo "=== Yooz Bootstrap Start ==="
set -e

# System update
apt-get update -y
apt-get upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Build tools + Nginx + Certbot
apt-get install -y build-essential nginx certbot python3-certbot-nginx unzip

# AWS CLI v2
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp/
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# PM2
npm install -g pm2

# App + secrets directories
mkdir -p /opt/yooz
mkdir -p /etc/yooz
mkdir -p /var/log/yooz
chmod 700 /etc/yooz
chown -R ubuntu:ubuntu /opt/yooz /var/log/yooz

# Enable Nginx on boot
systemctl enable nginx
systemctl start nginx

echo "=== Bootstrap Complete ==="
USERDATA
)

# ── 6. Launch Instance ───────────────────────────────────────
echo "🖥️  Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --iam-instance-profile Name="$PROFILE_NAME" \
  --user-data "$USER_DATA" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=yooz-server}]' \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "   Instance ID: $INSTANCE_ID"

# ── 7. Allocate Elastic IP ───────────────────────────────────
echo "🌐 Allocating Elastic IP..."
ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --region "$REGION" \
  --query 'AllocationId' \
  --output text)

echo "   Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

aws ec2 associate-address \
  --instance-id "$INSTANCE_ID" \
  --allocation-id "$ALLOC_ID" \
  --region "$REGION" > /dev/null

PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids "$ALLOC_ID" \
  --region "$REGION" \
  --query 'Addresses[0].PublicIp' \
  --output text)

# ── 8. Save instance info ────────────────────────────────────
cat > "$APP_DIR/.ec2-info" <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
REGION=$REGION
KEY_FILE=$KEY_FILE
ALLOC_ID=$ALLOC_ID
EOF

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ EC2 Instance Launched!                       ║"
echo "╠══════════════════════════════════════════════════╣"
printf "║  Instance ID : %-35s║\n" "$INSTANCE_ID"
printf "║  Public IP   : %-35s║\n" "$PUBLIC_IP"
printf "║  SSH Key     : %-35s║\n" "$KEY_FILE"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  👉 NEXT STEPS:                                  ║"
echo "║                                                  ║"
echo "║  1. Point your DNS:                              ║"
echo "║     yooz.org.il     → A → $PUBLIC_IP        ║"
echo "║     www.yooz.org.il → A → $PUBLIC_IP        ║"
echo "║                                                  ║"
echo "║  2. Wait ~5 min for bootstrap to finish, then:   ║"
echo "║     bash deploy/3-deploy.sh                      ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
